import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import type { Logger } from "pino";

export interface UpdateInfo {
  version: string;
  download_url: string;
  sha256: string;
  release_notes: string;
}

/**
 * Handles automatic updates for the runtime binary.
 * Currently a stub implementation; the real version would pull
 * signed binaries from Artifact Registry.
 */
export class AutoUpdater {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Check whether a newer version of the runtime is available.
   * Stub: always reports up-to-date.
   */
  async checkForUpdate(currentVersion: string): Promise<UpdateInfo | null> {
    this.logger.info(
      { currentVersion },
      "auto-update check: up to date",
    );

    // In production this would:
    // 1. GET https://<registry>/nexus-runtime/latest.json
    // 2. Compare semver with currentVersion
    // 3. Return UpdateInfo if a newer version exists

    return null;
  }

  /**
   * Download a new binary, verify its SHA-256 hash, and replace the
   * currently running executable.
   *
   * Stub: logs intent but does not actually download or replace anything.
   */
  async downloadAndApply(
    url: string,
    expectedHash: string,
  ): Promise<boolean> {
    this.logger.info({ url, expectedHash }, "Would download and apply update");

    // In production this would:
    // 1. Download the binary from `url` to a temp file
    // 2. Compute SHA-256 of the downloaded file
    // 3. Verify hash matches `expectedHash`
    // 4. Replace the current binary:
    //    - Rename current binary to <name>.bak
    //    - Move new binary into place
    //    - Set executable permissions
    // 5. Signal the process to restart (or let the supervisor do it)

    return false;
  }

  /**
   * Verify that a file matches the expected SHA-256 hash.
   */
  verifyHash(filePath: string, expectedHash: string): boolean {
    const data = readFileSync(filePath);
    const actual = createHash("sha256").update(data).digest("hex");
    return actual === expectedHash;
  }
}
