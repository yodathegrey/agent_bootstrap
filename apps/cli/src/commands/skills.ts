import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { apiGet, apiPost, apiDelete } from "../api.js";
import { printTable } from "../utils.js";

interface Skill {
  id: string;
  name: string;
  version?: string;
  status?: string;
}

export function registerSkillsCommand(program: Command): void {
  const skills = program
    .command("skills")
    .description("Manage skills");

  skills
    .command("list")
    .description("List all skills")
    .action(async () => {
      const spinner = ora("Fetching skills...").start();
      try {
        const data = await apiGet<{ skills: Skill[] }>("/skills");
        spinner.stop();

        const list = data.skills ?? [];
        if (list.length === 0) {
          console.log(chalk.dim("No skills found."));
          return;
        }

        printTable(
          ["ID", "Name", "Version", "Status"],
          list.map((s) => [
            s.id,
            s.name,
            s.version ?? "-",
            s.status ?? "-",
          ])
        );
      } catch (err) {
        spinner.fail("Failed to fetch skills");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  skills
    .command("install")
    .argument("<path>", "Path to skill directory containing skill.json")
    .description("Install a skill from a local path")
    .action(async (skillPath: string) => {
      const spinner = ora("Reading skill manifest...").start();
      try {
        const manifestPath = resolve(skillPath, "skill.json");
        const raw = await readFile(manifestPath, "utf-8");
        const manifest = JSON.parse(raw);

        spinner.text = "Installing skill...";
        const skill = await apiPost<Skill>("/skills", manifest);
        spinner.succeed("Skill installed");

        console.log(`  ${chalk.dim("ID:")}       ${skill.id}`);
        console.log(`  ${chalk.dim("Name:")}     ${skill.name}`);
        console.log(`  ${chalk.dim("Version:")}  ${skill.version ?? "-"}`);
      } catch (err) {
        spinner.fail("Failed to install skill");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  skills
    .command("uninstall")
    .argument("<id>", "Skill ID")
    .description("Uninstall a skill")
    .action(async (id: string) => {
      const spinner = ora("Uninstalling skill...").start();
      try {
        await apiDelete(`/skills/${id}`);
        spinner.succeed(`Skill ${id} uninstalled.`);
      } catch (err) {
        spinner.fail("Failed to uninstall skill");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}
