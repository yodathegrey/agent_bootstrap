import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { join, dirname } from "node:path";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import type { Logger } from "pino";
import type { RuntimeConfig } from "./config.js";
import { loadTlsCredentials } from "./tls.js";

// Inline proto definition for dynamic loading
const PROTO_CONTENT = `
syntax = "proto3";

package nexus.hub.v1;

service HubService {
  rpc Register (RegisterRequest) returns (RegisterResponse);
  rpc Heartbeat (HeartbeatRequest) returns (HeartbeatResponse);
  rpc ListenForTasks (ListenForTasksRequest) returns (stream TaskAssignment);
  rpc ReportResult (ReportResultRequest) returns (ReportResultResponse);
}

message RegisterRequest {
  string runtime_id = 1;
  string platform = 2;
  repeated string allowed_skills = 3;
}

message RegisterResponse {
  bool accepted = 1;
  string message = 2;
}

message HeartbeatRequest {
  string runtime_id = 1;
  int64 timestamp_ms = 2;
}

message HeartbeatResponse {
  bool acknowledged = 1;
}

message ListenForTasksRequest {
  string runtime_id = 1;
}

message TaskAssignment {
  string task_id = 1;
  string skill_name = 2;
  string runtime = 3;
  string input = 4;
  int32 timeout_ms = 5;
}

message ReportResultRequest {
  string task_id = 1;
  string stdout = 2;
  string stderr = 3;
  int32 exit_code = 4;
  string result = 5;
}

message ReportResultResponse {
  bool acknowledged = 1;
}
`;

export interface TaskAssignment {
  task_id: string;
  skill_name: string;
  runtime?: string;
  input: string;
  timeout_ms?: number;
}

export interface TaskResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  result: unknown;
}

type TaskHandler = (task: TaskAssignment) => Promise<void>;

export class HubClient {
  private hubUrl: string;
  private config: RuntimeConfig;
  private logger: Logger;
  private client: grpc.Client | null = null;
  private serviceDef: grpc.GrpcObject | null = null;
  private credentials: grpc.ChannelCredentials | null = null;
  private taskStream: grpc.ClientReadableStream<TaskAssignment> | null = null;
  private reconnectDelay = 2_000;
  private maxReconnectDelay = 30_000;
  private closed = false;

  constructor(hubUrl: string, config: RuntimeConfig, logger: Logger) {
    this.hubUrl = hubUrl;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Establish the gRPC connection with mTLS if certs are configured,
   * otherwise insecure for development.
   */
  async connect(): Promise<void> {
    // Write the inline proto to a temp file for proto-loader
    const protoDir = join(tmpdir(), "nexus-runtime-proto");
    if (!existsSync(protoDir)) {
      mkdirSync(protoDir, { recursive: true });
    }
    const protoPath = join(protoDir, "hub.proto");
    writeFileSync(protoPath, PROTO_CONTENT, "utf-8");

    const packageDefinition = await protoLoader.load(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    this.serviceDef = protoDescriptor.nexus as grpc.GrpcObject;

    // Determine credentials
    const certPath = this.config.get("tls_cert_path");
    const keyPath = this.config.get("tls_key_path");
    const caPath = this.config.get("ca_cert_path");

    if (certPath && keyPath && caPath) {
      this.credentials = loadTlsCredentials({ certPath, keyPath, caPath });
      this.logger.info("Using mTLS credentials");
    } else {
      this.credentials = grpc.credentials.createInsecure();
      this.logger.info("Using insecure credentials (dev mode)");
    }

    this.createClient();
  }

  private createClient(): void {
    if (!this.serviceDef || !this.credentials) {
      throw new Error("Must call connect() before using the client");
    }

    const hub = this.serviceDef.hub as grpc.GrpcObject;
    const v1 = hub.v1 as grpc.GrpcObject;
    const HubServiceClient = v1.HubService as grpc.ServiceClientConstructor;

    this.client = new HubServiceClient(
      this.hubUrl,
      this.credentials,
    );
  }

  /**
   * Register this runtime with the hub.
   */
  async register(
    runtimeId: string,
    platform: string,
    allowedSkills: string[],
  ): Promise<{ accepted: boolean; message: string }> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new Error("Client not connected"));
      }

      const request = {
        runtime_id: runtimeId,
        platform,
        allowed_skills: allowedSkills,
      };

      (this.client as any).Register(
        request,
        (err: grpc.ServiceError | null, response: { accepted: boolean; message: string }) => {
          if (err) {
            this.logger.error({ err }, "Registration failed");
            return reject(err);
          }
          resolve(response);
        },
      );
    });
  }

  /**
   * Send a heartbeat to the hub.
   */
  async heartbeat(runtimeId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new Error("Client not connected"));
      }

      const request = {
        runtime_id: runtimeId,
        timestamp_ms: Date.now().toString(),
      };

      (this.client as any).Heartbeat(
        request,
        (err: grpc.ServiceError | null, _response: { acknowledged: boolean }) => {
          if (err) {
            return reject(err);
          }
          resolve();
        },
      );
    });
  }

  /**
   * Open a server-streaming RPC to receive task assignments from the hub.
   * Automatically reconnects on disconnect.
   */
  listenForTasks(runtimeId: string, onTask: TaskHandler): void {
    if (!this.client) {
      throw new Error("Client not connected");
    }

    const request = { runtime_id: runtimeId };

    const startStream = (): void => {
      if (this.closed) return;

      this.taskStream = (this.client as any).ListenForTasks(request) as grpc.ClientReadableStream<TaskAssignment>;

      this.taskStream.on("data", (task: TaskAssignment) => {
        this.reconnectDelay = 2_000; // Reset on successful data
        void onTask(task);
      });

      this.taskStream.on("error", (err: Error) => {
        if (this.closed) return;
        this.logger.warn({ err: err.message }, "Task stream error, reconnecting...");
        this.scheduleReconnect(runtimeId, onTask);
      });

      this.taskStream.on("end", () => {
        if (this.closed) return;
        this.logger.info("Task stream ended, reconnecting...");
        this.scheduleReconnect(runtimeId, onTask);
      });
    };

    startStream();
  }

  private scheduleReconnect(runtimeId: string, onTask: TaskHandler): void {
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay,
    );

    this.logger.info({ delay }, "Scheduling reconnection");

    setTimeout(() => {
      if (this.closed) return;
      try {
        this.createClient();
        this.listenForTasks(runtimeId, onTask);
      } catch (err) {
        this.logger.error({ err }, "Reconnection failed");
        this.scheduleReconnect(runtimeId, onTask);
      }
    }, delay);
  }

  /**
   * Report a task execution result back to the hub.
   */
  async reportResult(taskId: string, result: TaskResult): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new Error("Client not connected"));
      }

      const request = {
        task_id: taskId,
        stdout: result.stdout,
        stderr: result.stderr,
        exit_code: result.exit_code,
        result: result.result != null ? JSON.stringify(result.result) : "",
      };

      (this.client as any).ReportResult(
        request,
        (err: grpc.ServiceError | null, _response: { acknowledged: boolean }) => {
          if (err) {
            this.logger.error({ err }, "Failed to report result");
            return reject(err);
          }
          resolve();
        },
      );
    });
  }

  /**
   * Close the client and stop any active streams.
   */
  close(): void {
    this.closed = true;

    if (this.taskStream) {
      this.taskStream.cancel();
      this.taskStream = null;
    }

    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }
}
