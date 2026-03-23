import { Command } from "commander";
import chalk from "chalk";
import { setConfig, getConfig } from "../config.js";

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description("Authenticate with the Nexus platform")
    .option("--token <token>", "Set authentication token manually")
    .action(async (opts: { token?: string }) => {
      if (opts.token) {
        setConfig("auth_token", opts.token);
        console.log(chalk.green("Authentication token saved successfully."));
        console.log(
          chalk.dim(`Token stored for API: ${getConfig().api_url}`)
        );
        return;
      }

      // TODO: Implement OAuth device flow for production
      console.log(
        chalk.yellow(
          "OAuth device flow not yet implemented. Use --token to set a token manually."
        )
      );
      console.log();
      console.log("Usage:");
      console.log(chalk.dim("  nexus login --token <your-api-token>"));
    });
}
