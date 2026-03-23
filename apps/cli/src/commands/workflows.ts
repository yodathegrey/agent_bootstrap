import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { apiGet, apiPost, streamSSE } from "../api.js";
import { printTable, parseJsonArg } from "../utils.js";

interface Workflow {
  id: string;
  name: string;
  status?: string;
  steps?: number;
  created_at?: string;
}

interface WorkflowRun {
  id: string;
  status: string;
}

export function registerWorkflowsCommand(program: Command): void {
  const workflows = program
    .command("workflows")
    .description("Manage workflows");

  workflows
    .command("list")
    .description("List all workflows")
    .action(async () => {
      const spinner = ora("Fetching workflows...").start();
      try {
        const data = await apiGet<{ workflows: Workflow[] }>("/workflows");
        spinner.stop();

        const list = data.workflows ?? [];
        if (list.length === 0) {
          console.log(chalk.dim("No workflows found."));
          return;
        }

        printTable(
          ["ID", "Name", "Status", "Steps"],
          list.map((w) => [
            w.id,
            w.name,
            w.status ?? "-",
            String(w.steps ?? "-"),
          ])
        );
      } catch (err) {
        spinner.fail("Failed to fetch workflows");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  workflows
    .command("get")
    .argument("<id>", "Workflow ID")
    .description("Get workflow details")
    .action(async (id: string) => {
      const spinner = ora("Fetching workflow...").start();
      try {
        const workflow = await apiGet<Workflow>(`/workflows/${id}`);
        spinner.stop();

        console.log(chalk.bold("Workflow Details"));
        console.log(`  ${chalk.dim("ID:")}       ${workflow.id}`);
        console.log(`  ${chalk.dim("Name:")}     ${workflow.name}`);
        console.log(`  ${chalk.dim("Status:")}   ${workflow.status ?? "-"}`);
        console.log(`  ${chalk.dim("Steps:")}    ${workflow.steps ?? "-"}`);
        if (workflow.created_at) {
          console.log(`  ${chalk.dim("Created:")}  ${workflow.created_at}`);
        }
      } catch (err) {
        spinner.fail("Failed to fetch workflow");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  workflows
    .command("run")
    .argument("<id>", "Workflow ID")
    .option("--input <json>", "Input JSON", "{}")
    .description("Run a workflow")
    .action(async (id: string, opts: { input: string }) => {
      const input = parseJsonArg(opts.input);
      const spinner = ora("Starting workflow run...").start();

      try {
        const run = await apiPost<WorkflowRun>(`/workflows/${id}/runs`, {
          input,
        });
        spinner.stop();

        console.log(chalk.dim(`Run ID: ${run.id}`));
        console.log();

        await streamSSE(
          `/workflows/${id}/runs/${run.id}/stream`,
          {},
          (event) => {
            if (event.type === "step_start") {
              try {
                const parsed = JSON.parse(event.data);
                console.log(
                  chalk.blue(`=> Step: ${parsed.name ?? parsed.step ?? "..."}`)
                );
              } catch {
                console.log(chalk.blue(`=> ${event.data}`));
              }
            } else if (event.type === "step_complete") {
              try {
                const parsed = JSON.parse(event.data);
                console.log(
                  chalk.green(
                    `   Done: ${parsed.name ?? parsed.step ?? "..."}`
                  )
                );
              } catch {
                console.log(chalk.green(`   ${event.data}`));
              }
            } else if (event.type === "output") {
              process.stdout.write(event.data);
            } else if (event.type === "error") {
              console.error(chalk.red(`Error: ${event.data}`));
            } else if (event.type === "done") {
              console.log();
              console.log(chalk.green("Workflow completed."));
            }
          }
        );
        console.log();
      } catch (err) {
        spinner.fail("Workflow run failed");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}
