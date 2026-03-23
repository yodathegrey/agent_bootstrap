import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Logger } from "pino";

export interface SkillManifest {
  name: string;
  runtime: "python" | "node";
  entry?: string; // module or inline code
}

export interface ExecutionOptions {
  timeout_ms?: number;
  memory_limit_mb?: number;
  env?: Record<string, string>;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  result: unknown;
}

/** Environment variables to strip from skill subprocess for security. */
const SENSITIVE_ENV_VARS = [
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "AZURE_CLIENT_SECRET",
  "DATABASE_URL",
  "DB_PASSWORD",
  "SECRET_KEY",
  "PRIVATE_KEY",
  "API_KEY",
  "TOKEN",
  "NEXUS_TLS_KEY",
];

export class SkillSandbox {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Execute a skill in a sandboxed subprocess.
   */
  async execute(
    manifest: SkillManifest,
    input: string,
    options: ExecutionOptions = {},
  ): Promise<ExecutionResult> {
    const timeoutMs = options.timeout_ms ?? 30_000;
    const memoryLimitMb = options.memory_limit_mb ?? 256;

    // Create an isolated working directory
    const workDir = mkdtempSync(join(tmpdir(), "nexus-skill-"));

    try {
      // Build a sanitized environment
      const cleanEnv = this.buildSanitizedEnv(options.env);

      // Write input to a file the skill can read
      const inputPath = join(workDir, "input.json");
      writeFileSync(inputPath, input, "utf-8");

      const result =
        manifest.runtime === "python"
          ? await this.executePython(manifest, inputPath, workDir, cleanEnv, timeoutMs, memoryLimitMb)
          : await this.executeNode(manifest, inputPath, workDir, cleanEnv, timeoutMs, memoryLimitMb);

      return result;
    } finally {
      // Clean up the temp directory
      try {
        rmSync(workDir, { recursive: true, force: true });
      } catch {
        this.logger.warn({ workDir }, "Failed to clean up skill working directory");
      }
    }
  }

  private async executePython(
    manifest: SkillManifest,
    inputPath: string,
    workDir: string,
    env: NodeJS.ProcessEnv,
    timeoutMs: number,
    memoryLimitMb: number,
  ): Promise<ExecutionResult> {
    const code =
      manifest.entry ??
      `
import json, sys
with open("${inputPath}") as f:
    data = json.load(f)
print(json.dumps({"status": "ok", "skill": "${manifest.name}", "input": data}))
`.trim();

    // Write the Python script to the working directory
    const scriptPath = join(workDir, "skill.py");
    writeFileSync(scriptPath, code, "utf-8");

    // Use ulimit to enforce memory limit on Unix-like systems
    const isWindows = process.platform === "win32";
    const command = isWindows ? "python" : "sh";
    const args = isWindows
      ? [scriptPath]
      : ["-c", `ulimit -v ${memoryLimitMb * 1024} 2>/dev/null; python3 "${scriptPath}"`];

    return this.spawnAndCollect(command, args, workDir, env, timeoutMs);
  }

  private async executeNode(
    manifest: SkillManifest,
    inputPath: string,
    workDir: string,
    env: NodeJS.ProcessEnv,
    timeoutMs: number,
    memoryLimitMb: number,
  ): Promise<ExecutionResult> {
    const code =
      manifest.entry ??
      `
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("${inputPath}", "utf-8"));
console.log(JSON.stringify({ status: "ok", skill: "${manifest.name}", input: data }));
`.trim();

    // Write the Node script to the working directory
    const scriptPath = join(workDir, "skill.js");
    writeFileSync(scriptPath, code, "utf-8");

    const args = [
      `--max-old-space-size=${memoryLimitMb}`,
      scriptPath,
    ];

    return this.spawnAndCollect("node", args, workDir, env, timeoutMs);
  }

  private spawnAndCollect(
    command: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    timeoutMs: number,
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const chunks: { stdout: Buffer[]; stderr: Buffer[] } = {
        stdout: [],
        stderr: [],
      };

      const child = spawn(command, args, {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: timeoutMs,
      });

      child.stdout.on("data", (chunk: Buffer) => chunks.stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => chunks.stderr.push(chunk));

      child.on("close", (code, signal) => {
        const stdout = Buffer.concat(chunks.stdout).toString("utf-8");
        const stderr = Buffer.concat(chunks.stderr).toString("utf-8");

        let exitCode = code ?? 1;
        let stderrOutput = stderr;

        if (signal === "SIGTERM") {
          exitCode = 137;
          stderrOutput = `Process killed: timeout after ${timeoutMs}ms\n${stderr}`;
        }

        // Attempt to parse the last line of stdout as JSON result
        let result: unknown = null;
        const lines = stdout.trim().split("\n");
        const lastLine = lines[lines.length - 1];
        if (lastLine) {
          try {
            result = JSON.parse(lastLine);
          } catch {
            // stdout is not JSON; that is fine
          }
        }

        resolve({ stdout, stderr: stderrOutput, exit_code: exitCode, result });
      });

      child.on("error", (err) => {
        resolve({
          stdout: "",
          stderr: `Spawn error: ${err.message}`,
          exit_code: 1,
          result: null,
        });
      });
    });
  }

  /**
   * Build a sanitized copy of the environment, stripping sensitive variables.
   */
  private buildSanitizedEnv(
    extra?: Record<string, string>,
  ): NodeJS.ProcessEnv {
    const env = { ...process.env };

    for (const key of SENSITIVE_ENV_VARS) {
      delete env[key];
    }

    // Also strip anything matching common secret patterns
    for (const key of Object.keys(env)) {
      const upper = key.toUpperCase();
      if (
        upper.includes("SECRET") ||
        upper.includes("PASSWORD") ||
        upper.includes("PRIVATE_KEY")
      ) {
        delete env[key];
      }
    }

    if (extra) {
      Object.assign(env, extra);
    }

    return env;
  }
}
