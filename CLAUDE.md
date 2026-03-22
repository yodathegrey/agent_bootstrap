# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository is in the **planning phase**. The codebase consists of architectural documentation (`plan.md`, `idea.md`) with no implementation yet. The planned system is called **Nexus** — an enterprise agent orchestration platform.

## Planned Tech Stack

- **Monorepo:** Turborepo
- **JS/TS Package Manager:** pnpm
- **Python Package Manager:** uv
- **API Gateway:** NestJS 11 (Cloud Run)
- **Orchestrator:** Python + Microsoft AutoGen 0.4+ (Cloud Run)
- **LLM Router:** TypeScript (Cloud Run)
- **Frontend:** Next.js 15 + React 19, Tailwind CSS 4 + shadcn/ui
- **Infrastructure:** Terraform on GCP (Firebase, Cloud Run, Firestore, Pub/Sub, Memorystore/Redis, Vertex AI)

## Planned Commands (once implemented)

```bash
# Install dependencies
pnpm install      # JS/TS packages
uv sync           # Python packages

# Development
pnpm dev          # Start all services via Turborepo
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm test         # Run all tests

# Single service
pnpm --filter @nexus/api-gateway dev
pnpm --filter @nexus/orchestrator test

# Infrastructure
terraform -chdir=infra/envs/dev plan
terraform -chdir=infra/envs/dev apply
```

## Architecture Overview

### Service Topology

```
User/CLI → Firebase Hosting (React/Next.js)
         → API Gateway (NestJS) ← Firebase Auth JWT validation
             ├── Orchestrator (Python/AutoGen) — agent session lifecycle
             │     ├── LLM Router — multi-provider proxy (Claude, OpenAI, Azure, Vertex, Ollama)
             │     ├── Skill Registry API — hot-loadable skills catalog
             │     └── Memory Service — Redis (kernel/session) + Firestore (long-term)
             └── Pub/Sub event bus → Cloud Functions (billing metering, memory writes)
```

### Key Design Patterns

**LLM Router:** Provider-agnostic canonical message format. Each provider (Anthropic, OpenAI, Azure, Vertex, Ollama) has a stateless TypeScript adapter. Model selection cascades down an agent's `model_preference` list based on rate-limit headroom and org policy.

**Skills:** Declarative manifests with `input_schema`/`output_schema`, runtime type (`python`/`node`/`wasm`), and permissions. Hot-loadable at runtime without redeployment. Sandboxed via gVisor (Linux) or seccomp.

**Memory:** Two-tier — Redis kernel memory (<8KB, session-scoped TTL) + Firestore long-term summaries with Vertex AI vector embeddings for retrieval.

**Security:** mTLS between all internal services via GCP Certificate Authority Service. Firebase Auth OIDC for users. GCP Workload Identity for services (no static keys). RBAC enforced in API Gateway against Firestore role docs.

**Multi-Agent Workflows:** DAG execution engine in the Orchestrator. Steps reference outputs via `$step.output` syntax with sequential, parallel, and conditional branching.

### Planned Monorepo Layout

```
apps/web/          # Next.js frontend
apps/cli/          # TypeScript CLI (single binary via pkg)
apps/runtime/      # Cross-platform agent runtime (~20MB binary)
services/api-gateway/
services/orchestrator/
services/llm-router/
services/skill-registry/
services/memory-service/
packages/shared-types/
packages/proto/    # gRPC protobuf definitions
packages/sdk/      # SDK for skill authors
skills/core/       # Built-in skills
infra/             # Terraform modules
```

### Development Phases

The project is planned across 5 phases (20 weeks total):
1. **Foundation** (wk 1–4): GCP setup, auth, API gateway, CI/CD
2. **Agent Engine** (wk 5–8): Orchestrator, LLM router, core skills, streaming UI
3. **Multi-Agent & Workflows** (wk 9–12): DAG engine, visual editor, long-term memory
4. **Runtime & Skills Marketplace** (wk 13–16): Cross-platform runtime, mTLS, skill sandboxing
5. **Hardening & Launch** (wk 17–20): Pen testing, load testing, billing, beta release
