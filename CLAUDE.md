# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**All 5 phases implemented.** The full Nexus platform is built: Foundation, Agent Engine, Multi-Agent & Workflows, Runtime & Skills Marketplace, and Hardening & Launch.

## Commands

```bash
# Install dependencies
pnpm install                                    # JS/TS packages
cd services/orchestrator && uv sync             # Python orchestrator

# Build all TypeScript packages
pnpm build

# Run services
pnpm --filter @nexus/api-gateway start          # API Gateway on port 3000
pnpm --filter @nexus/llm-router start           # LLM Router on port 3001
cd services/orchestrator && python -m nexus_orchestrator.main  # Orchestrator gRPC on port 50051
pnpm --filter @nexus/web dev                    # Next.js dev server

# Local infrastructure
docker-compose up -d                            # Redis + Pub/Sub emulator

# Terraform
terraform -chdir=infra plan -var-file=environments/dev.tfvars
```

## Tech Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **API Gateway:** NestJS 11, TypeScript, Firebase Auth, RBAC (`services/api-gateway`, port 3000)
- **LLM Router:** TypeScript, Express, Anthropic + OpenAI adapters (`services/llm-router`, port 3001)
- **Orchestrator:** Python 3.12, gRPC, AutoGen 0.4+, Redis, Pub/Sub (`services/orchestrator`, port 50051)
- **Frontend:** Next.js 15 + React 19, Tailwind CSS 4, Zustand (`apps/web`)
- **Shared Types:** `packages/shared-types` — canonical TS types
- **Proto:** `packages/proto` — gRPC protobuf definitions
- **Core Skills:** Python skills in `skills/core/` (web-search, file-reader, doc-summarizer, shell-exec, http-client, email-send, calendar-manage, code-interpreter)
- **CLI:** TypeScript CLI at `apps/cli/` — commands: login, agents, workflows, skills, config, logs
- **Cloud Functions:** `functions/memory-writer` — Pub/Sub-triggered memory persistence
- **Infrastructure:** Terraform on GCP (`infra/`)
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`, `deploy.yml`)

## Architecture

```
User → Next.js Frontend (apps/web)
     → API Gateway (NestJS, port 3000)
         ├── Agents CRUD
         ├── Sessions (create, send message via SSE, cancel)
         └── gRPC client → Orchestrator (Python, port 50051)
                             ├── LLM Router (TS, port 3001)
                             │     ├── Anthropic adapter (Claude)
                             │     └── OpenAI adapter (GPT)
                             ├── Redis kernel memory
                             ├── Pub/Sub events → memory-writer Cloud Function
                             └── Skills executor (web-search, file-reader, doc-summarizer)
```

### API Gateway Routes

- `GET  /api/v1/health` — Health check (no auth)
- `GET  /api/v1/agents` — List agents (viewer+)
- `GET  /api/v1/agents/:id` — Get agent (viewer+)
- `POST /api/v1/agents` — Create agent (developer+)
- `PATCH /api/v1/agents/:id` — Update agent (developer+)
- `DELETE /api/v1/agents/:id` — Delete agent (admin+)
- `POST /api/v1/agents/:agentId/sessions` — Create session (operator+)
- `POST /api/v1/sessions/:id/messages` — Send message, SSE streaming response (operator+)
- `GET  /api/v1/sessions/:id/events` — Subscribe to session events via SSE (operator+)
- `GET  /api/v1/sessions/:id` — Get session status (viewer+)
- `DELETE /api/v1/sessions/:id` — Cancel session (operator+)
- `GET  /api/docs` — Swagger UI

### Frontend Pages

- `/login` — Firebase Auth (email/password, Google)
- `/` — Dashboard with stats
- `/agents` — Agent catalog
- `/agents/:id` — Agent detail (config, run history)
- `/agents/:id/run` — Streaming chat UI with SSE
- `/workflows` — Workflows placeholder (Phase 3)
- `/skills` — Skills placeholder (Phase 4)
- `/settings` — Org settings hub

### LLM Router

- `POST /v1/chat/completions` — Accepts CanonicalRequest, returns NDJSON stream of StreamChunk
- `GET /health` — Health check
- Adapters: Anthropic (Claude), OpenAI (GPT), Azure OpenAI, Vertex AI (Gemini). Set corresponding API key env vars.

### Key Patterns

- **Firebase Auth** is lazy-loaded client-side only via `getFirebaseAuth()`. Avoids SSR/build errors.
- **RBAC** hierarchy: owner > admin > developer > operator > viewer. `@Roles()` + `RbacGuard`.
- **NestJS tsconfig** is standalone (no `incremental`, no extending base) to avoid stale emit cache issues.
- **LLM Router streaming** uses `Transfer-Encoding: chunked` with NDJSON (`application/x-ndjson`).
- **Sessions SSE** uses `text/event-stream` with `data:` prefixed JSON lines.
- **Orchestrator** communicates via gRPC (proto in `packages/proto/`), publishes to Pub/Sub topics.

### Monorepo Layout

```
apps/web/                    # Next.js frontend
services/api-gateway/        # NestJS API Gateway
services/llm-router/         # TypeScript LLM Router
services/orchestrator/       # Python gRPC Orchestrator
packages/shared-types/       # Canonical TypeScript types
packages/proto/              # gRPC protobuf definitions
skills/core/web-search/      # Web search skill (Python)
skills/core/file-reader/     # File reader skill (Python)
skills/core/doc-summarizer/  # Doc summarizer skill (Python)
skills/core/shell-exec/      # Shell command execution (Python)
skills/core/http-client/     # HTTP request skill (Python)
skills/core/email-send/      # Email sending skill (Python)
skills/core/calendar-manage/ # Calendar integration (Python)
skills/core/code-interpreter/ # Code execution sandbox (Python)
apps/cli/                    # TypeScript CLI (nexus command)
functions/memory-writer/     # Pub/Sub → Firestore Cloud Function
infra/                       # Terraform GCP modules
docs/firestore-schema.md     # Firestore collection schema
docker-compose.yml           # Local Redis + Pub/Sub emulator
```

## Development Phases

1. **Foundation** (wk 1–4): GCP setup, auth, API gateway, CI/CD — **DONE**
2. **Agent Engine** (wk 5–8): Orchestrator, LLM router, core skills, streaming UI — **DONE**
3. **Multi-Agent & Workflows** (wk 9–12): DAG engine, visual editor, long-term memory — **DONE**
4. **Runtime & Skills Marketplace** (wk 13–16): Cross-platform runtime, mTLS, skill sandboxing — **DONE**
5. **Hardening & Launch** (wk 17–20): Pen testing, load testing, billing, beta release — **DONE**
