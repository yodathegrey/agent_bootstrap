import { Command } from "commander";
import chalk from "chalk";
import { getConfig, setConfig } from "../config.js";

export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command("config")
    .description("Manage CLI configuration");

  configCmd
    .command("set")
    .argument("<key>", "Configuration key")
    .argument("<value>", "Configuration value")
    .description("Set a configuration value")
    .action((key: string, value: string) => {
      const validKeys = ["api_url", "auth_token"];
      if (!validKeys.includes(key)) {
        console.error(
          chalk.red(`Invalid config key: ${key}. Valid keys: ${validKeys.join(", ")}`)
        );
        process.exit(1);
      }
      setConfig(key as "api_url" | "auth_token", value);
      console.log(chalk.green(`Config ${key} set successfully.`));
    });

  configCmd
    .command("get")
    .argument("<key>", "Configuration key")
    .description("Get a configuration value")
    .action((key: string) => {
      const config = getConfig();
      const value = config[key as keyof typeof config];
      if (value === undefined) {
        console.error(chalk.red(`Unknown config key: ${key}`));
        process.exit(1);
      }
      console.log(value);
    });

  configCmd
    .command("list")
    .description("Show all configuration values")
    .action(() => {
      const config = getConfig();
      console.log(chalk.bold("Configuration"));
      for (const [key, value] of Object.entries(config)) {
        const displayValue =
          key === "auth_token" && value
            ? value.slice(0, 8) + "..." + value.slice(-4)
            : value || chalk.dim("(not set)");
        console.log(`  ${chalk.dim(key + ":")} ${displayValue}`);
      }
    });
}
