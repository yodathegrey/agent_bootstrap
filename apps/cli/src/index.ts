#!/usr/bin/env node

import { Command } from "commander";
import { registerLoginCommand } from "./commands/login.js";
import { registerAgentsCommand } from "./commands/agents.js";
import { registerWorkflowsCommand } from "./commands/workflows.js";
import { registerSkillsCommand } from "./commands/skills.js";
import { registerConfigCommand } from "./commands/config-cmd.js";
import { registerLogsCommand } from "./commands/logs.js";

const program = new Command();

program
  .name("nexus")
  .description("Nexus CLI — Enterprise Agent Orchestration")
  .version("1.0.0")
  .option(
    "--api-url <url>",
    "API base URL",
    "http://localhost:3000/api/v1"
  );

registerLoginCommand(program);
registerAgentsCommand(program);
registerWorkflowsCommand(program);
registerSkillsCommand(program);
registerConfigCommand(program);
registerLogsCommand(program);

program.parse();
