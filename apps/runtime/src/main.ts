#!/usr/bin/env node

import { parseArgs } from "node:util";
import process from "node:process";
import pino from "pino";
import { RuntimeConfig } from "./config.js";
import { HubClient } from "./hub-client.js";
import { SkillSandbox } from "./skill-sandbox.js";
import { MemoryCache } from "./memory-cache.js";
import { AutoUpdater } from "./auto-update.js";
import { getRuntimeInfo } from "./platform.js";

const VERSION = "0.1.0";

function main(): void {
  const { values } = parseArgs({
    options: {
      "hub-url": { type: "string", default: "localhost:50051" },
      "config-path": { type: "string", default: "~/.nexus/runtime.json" },
      "runtime-id": { type: "string" },
      version: { type: "boolean", default: false },
    },
    strict: false,
  });

  if (values.version) {
    console.log(`nexus-runtime v${VERSION}`);
    process.exit(0);
  }

  const logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
    level: process.env.LOG_LEVEL ?? "info",
  });

  const configPath = (values["config-path"] as string).replace(
    "~",
    process.env.HOME ?? "",
  );

  const config = new RuntimeConfig(configPath);

  // CLI args override config file values
  if (values["hub-url"]) {
    config.set("hub_url", values["hub-url"] as string);
  }
  if (values["runtime-id"]) {
    config.set("runtime_id", values["runtime-id"] as string);
  }

  const runtimeId =
    config.get("runtime_id") ?? `runtime-${Date.now().toString(36)}`;
  config.set("runtime_id", runtimeId);

  const hubUrl = config.get("hub_url") ?? "localhost:50051";
  const platformInfo = getRuntimeInfo(VERSION);

  logger.info({ runtimeId, hubUrl, platform: platformInfo }, "Starting Nexus Runtime");

  const hubClient = new HubClient(hubUrl, config, logger);
  const skillSandbox = new SkillSandbox(logger);
  const cache = new MemoryCache({ maxSize: 100, maxEntryBytes: 8192 });
  const updater = new AutoUpdater(logger);

  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let shutdownRequested = false;

  async function start(): Promise<void> {
    try {
      await hubClient.connect();
      logger.info("Connected to hub");

      await hubClient.register(
        runtimeId,
        `${platformInfo.platform}-${platformInfo.arch}`,
        config.get("allowed_skills") ?? [],
      );
      logger.info("Registered with hub");

      // Start heartbeat every 10 seconds
      heartbeatTimer = setInterval(async () => {
        try {
          await hubClient.heartbeat(runtimeId);
          logger.debug("Heartbeat sent");
        } catch (err) {
          logger.warn({ err }, "Heartbeat failed");
        }
      }, 10_000);

      // Listen for task assignments
      hubClient.listenForTasks(runtimeId, async (task) => {
        logger.info({ taskId: task.task_id, skill: task.skill_name }, "Received task");

        // Check cache first
        const cacheKey = `${task.skill_name}:${JSON.stringify(task.input)}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          logger.info({ taskId: task.task_id }, "Returning cached result");
          await hubClient.reportResult(task.task_id, cached as import("./hub-client.js").TaskResult);
          return;
        }

        try {
          const result = await skillSandbox.execute(
            { name: task.skill_name, runtime: (task.runtime ?? "python") as "python" | "node" },
            task.input,
            { timeout_ms: task.timeout_ms ?? 30_000 },
          );

          // Cache successful results for 5 minutes
          if (result.exit_code === 0) {
            cache.set(cacheKey, result, 300_000);
          }

          await hubClient.reportResult(task.task_id, result);
          logger.info({ taskId: task.task_id, exitCode: result.exit_code }, "Task completed");
        } catch (err) {
          logger.error({ err, taskId: task.task_id }, "Task execution failed");
          await hubClient.reportResult(task.task_id, {
            stdout: "",
            stderr: err instanceof Error ? err.message : "Unknown error",
            exit_code: 1,
            result: null,
          });
        }
      });

      // Auto-update check
      if (config.get("auto_update") !== false) {
        const interval = config.get("update_check_interval_ms") ?? 3_600_000;
        setInterval(async () => {
          try {
            await updater.checkForUpdate(VERSION);
          } catch (err) {
            logger.warn({ err }, "Auto-update check failed");
          }
        }, interval);

        // Initial check
        await updater.checkForUpdate(VERSION);
      }

      logger.info("Runtime is ready and listening for tasks");
    } catch (err) {
      logger.error({ err }, "Failed to start runtime");
      process.exit(1);
    }
  }

  async function shutdown(): Promise<void> {
    if (shutdownRequested) return;
    shutdownRequested = true;

    logger.info("Shutting down...");

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }

    cache.clear();
    hubClient.close();

    logger.info("Shutdown complete");
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());

  void start();
}

main();
