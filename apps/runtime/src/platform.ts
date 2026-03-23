import { platform, arch, hostname } from "node:os";

export type Platform = "linux" | "macos" | "windows";
export type Arch = "x64" | "arm64";

export interface RuntimeInfo {
  platform: Platform;
  arch: Arch;
  node_version: string;
  runtime_version: string;
  hostname: string;
}

/**
 * Detect the current operating system.
 */
export function getPlatform(): Platform {
  const p = platform();
  switch (p) {
    case "linux":
      return "linux";
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    default:
      // Fall back to linux for unknown Unix-like platforms
      return "linux";
  }
}

/**
 * Detect the current CPU architecture.
 */
export function getArch(): Arch {
  const a = arch();
  switch (a) {
    case "x64":
      return "x64";
    case "arm64":
      return "arm64";
    default:
      return "x64";
  }
}

/**
 * Collect full runtime information for registration with the hub.
 */
export function getRuntimeInfo(runtimeVersion: string): RuntimeInfo {
  return {
    platform: getPlatform(),
    arch: getArch(),
    node_version: process.version,
    runtime_version: runtimeVersion,
    hostname: hostname(),
  };
}
