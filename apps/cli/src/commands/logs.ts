import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { apiGet } from "../api.js";
import { formatDuration } from "../utils.js";

interface Session {
  id: string;
  status?: string;
  created_at?: string;
  duration_ms?: number;
  messages?: number;
}

export function registerLogsCommand(program: Command): void {
  program
    .command("logs")
    .description("View agent run logs")
    .requiredOption("--agent <id>", "Agent ID")
    .option("--last <duration>", "Time window (e.g., 1h, 30m, 7d)", "24h")
    .action(async (opts: { agent: string; last: string }) => {
      const spinner = ora("Fetching logs...").start();
      try {
        const data = await apiGet<{ sessions: Session[] }>(
          `/agents/${opts.agent}/sessions?last=${opts.last}`
        );
        spinner.stop();

        const sessions = data.sessions ?? [];
        if (sessions.length === 0) {
          console.log(chalk.dim("No sessions found in the specified window."));
          return;
        }

        console.log(
          chalk.bold(`Sessions for agent ${opts.agent} (last ${opts.last})`)
        );
        console.log();

        for (const session of sessions) {
          const status = session.status ?? "unknown";
          const statusColor =
            status === "completed"
              ? chalk.green
              : status === "failed"
                ? chalk.red
                : chalk.yellow;

          console.log(`  ${chalk.dim("Session:")}  ${session.id}`);
          console.log(`  ${chalk.dim("Status:")}   ${statusColor(status)}`);
          if (session.created_at) {
            console.log(`  ${chalk.dim("Started:")}  ${session.created_at}`);
          }
          if (session.duration_ms !== undefined) {
            console.log(
              `  ${chalk.dim("Duration:")} ${formatDuration(session.duration_ms)}`
            );
          }
          if (session.messages !== undefined) {
            console.log(
              `  ${chalk.dim("Messages:")} ${session.messages}`
            );
          }
          console.log();
        }
      } catch (err) {
        spinner.fail("Failed to fetch logs");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}
