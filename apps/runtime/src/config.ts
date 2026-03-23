import Conf from "conf";
import { readFileSync, existsSync } from "node:fs";

export interface RuntimeConfigSchema {
  hub_url: string;
  runtime_id: string;
  org_id: string;
  allowed_skills: string[];
  tls_cert_path: string;
  tls_key_path: string;
  ca_cert_path: string;
  auto_update: boolean;
  update_check_interval_ms: number;
}

const defaults: RuntimeConfigSchema = {
  hub_url: "localhost:50051",
  runtime_id: "",
  org_id: "",
  allowed_skills: [],
  tls_cert_path: "",
  tls_key_path: "",
  ca_cert_path: "",
  auto_update: true,
  update_check_interval_ms: 3_600_000,
};

export class RuntimeConfig {
  private store: Conf<RuntimeConfigSchema>;
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;

    this.store = new Conf<RuntimeConfigSchema>({
      projectName: "nexus-runtime",
      defaults,
      configName: "runtime",
    });

    // Load overrides from the user-specified file if it exists
    this.loadFromFile(configPath);
  }

  /**
   * Load configuration values from a JSON file, merging with defaults.
   */
  loadFromFile(filePath: string): void {
    if (!existsSync(filePath)) {
      return;
    }

    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<RuntimeConfigSchema>;

      for (const [key, value] of Object.entries(parsed)) {
        if (key in defaults && value !== undefined) {
          this.store.set(key as keyof RuntimeConfigSchema, value as never);
        }
      }
    } catch {
      // If the file is unreadable or malformed, stick with defaults
    }
  }

  /**
   * Get a configuration value by key.
   */
  get<K extends keyof RuntimeConfigSchema>(
    key: K,
  ): RuntimeConfigSchema[K] {
    return this.store.get(key);
  }

  /**
   * Set a configuration value by key.
   */
  set<K extends keyof RuntimeConfigSchema>(
    key: K,
    value: RuntimeConfigSchema[K],
  ): void {
    this.store.set(key, value);
  }

  /**
   * Return the full config as a plain object.
   */
  getAll(): RuntimeConfigSchema {
    return this.store.store;
  }

  /**
   * Return the resolved config file path.
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Reset all values to defaults.
   */
  reset(): void {
    this.store.clear();
  }
}
