# CLI Reference

## Installation

```bash
pnpm --filter @nexus/cli build
npx nexus --help
```

## Authentication

```bash
nexus login --token <your-firebase-token>
```

## Agent Commands

```bash
nexus agents list
nexus agents get <agent-id>
nexus agents create --name "Research Agent" --model claude-sonnet-4-6 --skills web-search,doc-summarizer
nexus agents run <agent-id> --input '{"query": "Research Acme Corp"}'
nexus agents delete <agent-id>
```

## Workflow Commands

```bash
nexus workflows list
nexus workflows get <workflow-id>
nexus workflows run <workflow-id> --input '{"company": "Acme Corp"}'
```

## Skill Commands

```bash
nexus skills list
nexus skills install ./my-custom-skill/
nexus skills uninstall <skill-id>
```

## Configuration

```bash
nexus config set llm.default claude-sonnet-4-6
nexus config get api_url
nexus config list
```

## Logs

```bash
nexus logs --agent <agent-id> --last 1h
```

## Global Options

| Option | Description | Default |
|---|---|---|
| `--api-url <url>` | API base URL | `http://localhost:3000/api/v1` |
| `-V, --version` | Show version | |
| `-h, --help` | Show help | |
