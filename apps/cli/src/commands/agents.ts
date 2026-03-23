import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { apiGet, apiPost, apiDelete, streamSSE } from "../api.js";
import { printTable, parseJsonArg } from "../utils.js";

interface Agent {
  id: string;
  name: string;
  model?: string;
  status?: string;
  created_at?: string;
}

interface Session {
  id: string;
}

export function registerAgentsCommand(program: Command): void {
  const agents = program
    .command("agents")
    .description("Manage agents");

  agents
    .command("list")
    .description("List all agents")
    .action(async () => {
      const spinner = ora("Fetching agents...").start();
      try {
        const data = await apiGet<{ agents: Agent[] }>("/agents");
        spinner.stop();

        const agentList = data.agents ?? [];
        if (agentList.length === 0) {
          console.log(chalk.dim("No agents found."));
          return;
        }

        printTable(
          ["ID", "Name", "Model", "Status"],
          agentList.map((a) => [
            a.id,
            a.name,
            a.model ?? "-",
            a.status ?? "-",
          ])
        );
      } catch (err) {
        spinner.fail("Failed to fetch agents");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  agents
    .command("get")
    .argument("<id>", "Agent ID")
    .description("Get agent details")
    .action(async (id: string) => {
      const spinner = ora("Fetching agent...").start();
      try {
        const agent = await apiGet<Agent>(`/agents/${id}`);
        spinner.stop();

        console.log(chalk.bold("Agent Details"));
        console.log(`  ${chalk.dim("ID:")}       ${agent.id}`);
        console.log(`  ${chalk.dim("Name:")}     ${agent.name}`);
        console.log(`  ${chalk.dim("Model:")}    ${agent.model ?? "-"}`);
        console.log(`  ${chalk.dim("Status:")}   ${agent.status ?? "-"}`);
        if (agent.created_at) {
          console.log(`  ${chalk.dim("Created:")}  ${agent.created_at}`);
        }
      } catch (err) {
        spinner.fail("Failed to fetch agent");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  agents
    .command("run")
    .argument("<id>", "Agent ID")
    .option("--input <json>", "Input JSON", "{}")
    .description("Run an agent interactively")
    .action(async (id: string, opts: { input: string }) => {
      const input = parseJsonArg(opts.input);
      const spinner = ora("Creating session...").start();

      try {
        const session = await apiPost<Session>(`/agents/${id}/sessions`, {});
        spinner.text = "Sending message...";

        spinner.stop();
        console.log(chalk.dim(`Session: ${session.id}`));
        console.log();

        await streamSSE(
          `/sessions/${session.id}/messages`,
          { content: input },
          (event) => {
            if (event.type === "message" || event.type === "content") {
              try {
                const parsed = JSON.parse(event.data);
                if (parsed.content) {
                  process.stdout.write(parsed.content);
                } else if (parsed.text) {
                  process.stdout.write(parsed.text);
                } else {
                  process.stdout.write(event.data);
                }
              } catch {
                process.stdout.write(event.data);
              }
            } else if (event.type === "error") {
              console.error(chalk.red(`\nError: ${event.data}`));
            } else if (event.type === "done") {
              console.log();
              console.log(chalk.green("Done."));
            }
          }
        );
        console.log();
      } catch (err) {
        spinner.fail("Agent run failed");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  agents
    .command("create")
    .description("Create a new agent")
    .requiredOption("--name <name>", "Agent name")
    .option("--model <model>", "Model to use")
    .option("--skills <skills>", "Comma-separated list of skill IDs")
    .action(
      async (opts: { name: string; model?: string; skills?: string }) => {
        const spinner = ora("Creating agent...").start();
        try {
          const body: Record<string, unknown> = { name: opts.name };
          if (opts.model) body.model = opts.model;
          if (opts.skills) body.skills = opts.skills.split(",").map((s) => s.trim());

          const agent = await apiPost<Agent>("/agents", body);
          spinner.succeed("Agent created");

          console.log(`  ${chalk.dim("ID:")}     ${agent.id}`);
          console.log(`  ${chalk.dim("Name:")}   ${agent.name}`);
        } catch (err) {
          spinner.fail("Failed to create agent");
          console.error(chalk.red((err as Error).message));
          process.exit(1);
        }
      }
    );

  agents
    .command("delete")
    .argument("<id>", "Agent ID")
    .description("Delete an agent")
    .action(async (id: string) => {
      const spinner = ora("Deleting agent...").start();
      try {
        await apiDelete(`/agents/${id}`);
        spinner.succeed(`Agent ${id} deleted.`);
      } catch (err) {
        spinner.fail("Failed to delete agent");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}
