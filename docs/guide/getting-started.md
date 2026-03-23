# Getting Started

This guide walks you through setting up the Agent Orchestration Platform, creating your first agent, running it, and viewing the results.

## Prerequisites

Before you begin, make sure you have the following:

- **Node.js 20 or later** -- [Download Node.js](https://nodejs.org/)
- **A platform account** -- Sign up at [https://app.example.com/signup](https://app.example.com/signup) or via the CLI
- **The Nexus CLI** -- installed globally via npm (see below)

### Install the CLI

```bash
npm install -g @nexus/cli
```

Verify the installation:

```bash
nexus --version
```

You should see output like `nexus/1.0.0`.

---

## Step 1: Sign Up and Log In

### Sign up via the web

1. Navigate to [https://app.example.com/signup](https://app.example.com/signup).
2. Enter your email address and create a password.
3. Choose a plan (Starter, Team, or Enterprise). All plans include a 14-day free trial with no credit card required.
4. Confirm your email address by clicking the link in the verification email.

### Sign up via the CLI

```bash
nexus signup
```

Follow the interactive prompts to create your account.

### Log in

Once your account is created, authenticate the CLI:

```bash
nexus login
```

This opens a browser window for authentication. After you authorize the CLI, a token is stored locally at `~/.nexus/credentials.json`. The token is valid for 30 days and refreshes automatically.

To verify your session:

```bash
nexus whoami
```

---

## Step 2: Create Your First Agent

An agent is a configured LLM with a system prompt, a set of skills (tools), and execution parameters.

### Create an agent interactively

```bash
nexus agent create
```

The CLI walks you through the configuration:

1. **Name** -- a human-readable name (e.g., "Customer Support Bot").
2. **Description** -- a short description of what the agent does.
3. **Model** -- the LLM to use (e.g., `claude-sonnet-4-20250514`, `gpt-4o`).
4. **System prompt** -- the instructions that define the agent's behavior.
5. **Skills** -- select from available skills (e.g., `web-search`, `file-reader`, `calculator`).

### Create an agent from a config file

You can also define an agent in a YAML file:

```yaml
# my-agent.yaml
name: Customer Support Bot
description: Answers customer questions using the knowledge base
model: claude-sonnet-4-20250514
systemPrompt: |
  You are a helpful customer support agent. Answer questions based on the
  provided knowledge base. If you do not know the answer, say so and offer
  to escalate to a human agent.
skills:
  - web-search
  - knowledge-base-lookup
parameters:
  temperature: 0.3
  maxTokens: 1024
```

Then create the agent:

```bash
nexus agent create --from my-agent.yaml
```

You should see confirmation:

```
Agent created: agent_abc123
Name: Customer Support Bot
Model: claude-sonnet-4-20250514
Skills: web-search, knowledge-base-lookup
```

---

## Step 3: Run the Agent

### Run interactively (chat mode)

```bash
nexus agent run agent_abc123
```

This starts a chat session in your terminal. Type messages and press Enter to send them to the agent. Type `exit` or press `Ctrl+C` to end the session.

```
You: What is your return policy?
Agent: Our return policy allows returns within 30 days of purchase...

You: exit
Session ended. Run ID: run_xyz789
```

### Run with a single prompt

```bash
nexus agent run agent_abc123 --prompt "What is your return policy?"
```

The agent processes the prompt and prints the response to stdout.

### Run with input from a file

```bash
nexus agent run agent_abc123 --input questions.txt
```

Each line in the file is treated as a separate prompt. Results are printed to stdout.

---

## Step 4: View Results

### View run history

```bash
nexus runs list --agent agent_abc123
```

Output:

```
RUN ID         STATUS      STARTED              DURATION   TOKENS
run_xyz789     completed   2026-03-22 10:15:03  2.4s       342
run_xyz788     completed   2026-03-22 10:12:41  1.8s       218
run_xyz787     failed      2026-03-22 10:10:22  0.5s       0
```

### View a specific run

```bash
nexus runs show run_xyz789
```

This displays the full conversation, including tool calls, token usage, cost, and timing.

### View runs in the web dashboard

Navigate to [https://app.example.com/agents/agent_abc123/runs](https://app.example.com/agents/agent_abc123/runs) to view run history in the browser. The dashboard provides filtering, search, and detailed inspection of each run.

---

## Next Steps

- [Managing Agents](managing-agents.md) -- learn how to update, delete, and monitor agents
- [Installing Skills](installing-skills.md) -- extend your agent's capabilities
- [CLI Reference](cli-reference.md) -- full command reference
- [Billing & Subscriptions](billing.md) -- understand your usage and plan limits
