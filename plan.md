# Enterprise Agent Orchestration Platform — Architecture Plan

> **Codename:** Nexus  
> **Version:** 0.1.0-draft  
> **Last Updated:** 2026-03-22  
> **Target Deployment:** Google Cloud Platform (Firebase + Cloud Run)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Core Components](#3-core-components)
4. [Agent Lifecycle & Orchestration](#4-agent-lifecycle--orchestration)
5. [Multi-LLM Integration Layer](#5-multi-llm-integration-layer)
6. [Skills Framework](#6-skills-framework)
7. [Communication & Security](#7-communication--security)
8. [Memory Architecture](#8-memory-architecture)
9. [Frontend Application](#9-frontend-application)
10. [Cross-Platform Agent Runtime](#10-cross-platform-agent-runtime)
11. [Deployment Strategy](#11-deployment-strategy)
12. [Documentation Standards](#12-documentation-standards)
13. [Project Phases & Milestones](#13-project-phases--milestones)
14. [Security Hardening](#14-security-hardening-audit-remediation)
15. [Stripe Billing Integration](#15-stripe-billing-integration)
16. [Updated Page Map](#16-updated-page-map)
17. [Updated Project Phases (Stripe)](#17-updated-project-phases-stripe-integration)
18. [Appendices](#18-appendices)

---

## 1. Executive Summary

Nexus is an enterprise-grade agent orchestration platform that allows organizations to define, deploy, manage, and monitor AI-powered agents across business workflows. Agents are coordinated through a centralized hub, communicate over secure protocols, integrate with any major LLM provider, and operate within a fine-grained permissions model.

**Key differentiators:**

- **Multi-LLM routing** — Agents can use Claude, GPT, Azure OpenAI, Gemini, or self-hosted models interchangeably via a unified adapter layer.
- **Hot-loadable skills** — A plugin system that lets agents acquire new capabilities at runtime without redeployment.
- **Enterprise security posture** — mTLS between services, OAuth 2.0 / OIDC for users, RBAC at every layer, encrypted-at-rest memory stores, and full audit logging.
- **Cross-platform agent runtime** — Lightweight runtime packaged for Linux, macOS, and Windows, enabling agents to execute tasks on any enterprise endpoint.
- **Modern UX** — React-based console with full CLI parity for DevOps and headless environments.

---

## 2. System Architecture

### 2.1 High-Level Topology

```
┌──────────────────────────────────────────────────────────────────────┐
│                        GOOGLE CLOUD PLATFORM                         │
│                                                                      │
│  ┌─────────────┐    ┌──────────────────┐    ┌────────────────────┐  │
│  │  Firebase    │    │  Cloud Run       │    │  Cloud Run         │  │
│  │  Hosting     │◄──►│  API Gateway     │◄──►│  Orchestrator      │  │
│  │  (React UI)  │    │  (NestJS)        │    │  (Agent Engine)    │  │
│  └─────────────┘    └──────┬───────────┘    └────────┬───────────┘  │
│                            │                         │               │
│                     ┌──────▼───────────────────────────▼──────┐      │
│                     │         Event Bus (Pub/Sub)             │      │
│                     └──────┬──────────────┬──────────────┬────┘      │
│                            │              │              │            │
│  ┌─────────────┐    ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐    │
│  │  Firestore   │    │  LLM        │ │  Skill    │ │  Memory   │    │
│  │  (Config,    │    │  Router     │ │  Registry │ │  Service  │    │
│  │   RBAC,      │    │  (Cloud Run)│ │  (GCR +   │ │  (Redis + │    │
│  │   Audit Log) │    └─────────────┘ │  Firestore)│ │  Firestore│    │
│  └─────────────┘                     └───────────┘ └───────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Secret Manager  │  Cloud KMS  │  Cloud Logging  │  IAM      │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
         ▲               ▲               ▲
         │ gRPC/TLS      │ gRPC/TLS      │ gRPC/TLS
   ┌─────┴────┐    ┌─────┴────┐    ┌─────┴────┐
   │  Agent    │    │  Agent    │    │  Agent    │
   │  Runtime  │    │  Runtime  │    │  Runtime  │
   │  (Linux)  │    │  (macOS)  │    │  (Windows)│
   └──────────┘    └──────────┘    └──────────┘
```

### 2.2 Design Principles

1. **Zero-trust networking** — Every service-to-service call is authenticated and encrypted. No implicit trust based on network position.
2. **Stateless compute, stateful stores** — Cloud Run services hold no local state; all persistence is in Firestore, Redis, or Cloud Storage.
3. **Event-driven coordination** — Agents communicate through Pub/Sub topics, not point-to-point calls. This enables replay, observability, and decoupling.
4. **Configuration as data** — Agent definitions, skill manifests, and routing rules live in Firestore. Changes take effect without redeployment.
5. **Least-privilege by default** — Every agent, user, and service account receives only the permissions required for its role.

---

## 3. Core Components

### 3.1 API Gateway (NestJS on Cloud Run)

The single entry point for all client traffic (React UI and CLI).

| Responsibility | Detail |
|---|---|
| Authentication | Firebase Auth (OIDC) — validates JWTs on every request |
| Authorization | RBAC middleware checks Firestore role assignments |
| Rate limiting | Per-user and per-org token-bucket via Redis |
| Request routing | Forwards to Orchestrator, Skill Registry, or Memory Service |
| WebSocket relay | Streams real-time agent output to the UI via Server-Sent Events (SSE) |
| API versioning | `/api/v1/...` prefix with semver contract |

**Tech:** NestJS 11, TypeScript, Passport.js (Firebase strategy), Helmet, class-validator.

### 3.2 Orchestrator (Agent Engine on Cloud Run)

The brain of the system. Receives task requests, resolves which agents to invoke, manages multi-step workflows, and handles failure/retry.

| Responsibility | Detail |
|---|---|
| Agent resolution | Maps a task to one or more agents based on capability tags |
| Workflow execution | Supports sequential, parallel, and conditional DAG-based flows |
| Lifecycle management | Provisions, monitors, and tears down agent sessions |
| Tool/skill binding | Attaches permitted skills to an agent session at launch time |
| Context assembly | Builds the prompt context window (system prompt + memory + skill docs + conversation) |

**Implementation:** Microsoft AutoGen 0.4+ framework running on Python 3.12. AutoGen provides the agent-to-agent messaging, tool-use protocol, and group-chat patterns. Custom plugins wrap AutoGen for GCP integration.

### 3.3 LLM Router (Cloud Run)

A model-agnostic proxy that normalizes requests/responses across providers.

| Provider | Protocol | Notes |
|---|---|---|
| Anthropic Claude API | HTTPS REST | Claude Opus 4.6, Sonnet 4.6, Haiku 4.5 |
| OpenAI API | HTTPS REST | GPT-4o, o3, o4-mini |
| Azure OpenAI | HTTPS REST | Enterprise isolation, private endpoints |
| Google Vertex AI | gRPC + REST | Gemini 2.5 Pro/Flash |
| Self-hosted (Ollama/vLLM) | HTTPS REST | On-prem models via VPN tunnel |

**Key features:**

- **Unified message format** — Internal canonical schema translated to each provider's format.
- **Fallback chains** — If a primary model times out or errors, the router retries with a configured secondary.
- **Cost tracking** — Logs input/output tokens per request; aggregated in Firestore for billing dashboards.
- **Credentials** — All API keys stored in Google Secret Manager; retrieved at cold-start and cached in memory.

### 3.4 Skill Registry (Cloud Run + Firestore + Artifact Registry)

The catalog of capabilities available to agents.

- **Skill manifest** — Each skill is a JSON document describing its name, version, input/output schema, required permissions, and compatible platforms.
- **Skill artifact** — The executable code (Python wheel, npm package, or WASM module) stored in Google Artifact Registry.
- **Hot-loading** — The Orchestrator fetches and loads skills at agent session creation time. No redeployment required.
- **Sandboxing** — Skills execute in isolated gVisor containers (Cloud Run's default sandbox) or, for agent runtimes, in a restricted subprocess with seccomp profiles.

### 3.5 Memory Service (Redis + Firestore)

Two-tier memory system designed for low latency and minimal footprint.

| Tier | Store | TTL | Purpose |
|---|---|---|---|
| Kernel memory | Redis (Memorystore) | Session-scoped | Active context window: current task, last N turns, working scratchpad. Kept under 8 KB per agent. |
| Long-term memory | Firestore | Indefinite (policy-based pruning) | Summarized outcomes, learned preferences, cross-session knowledge. Queryable with vector embeddings via Vertex AI Vector Search. |

**Write path:** Agent → Pub/Sub → Memory Writer (Cloud Function) → Redis + Firestore.  
**Read path:** Orchestrator queries Redis first; on miss, falls back to Firestore vector search.

---

## 4. Agent Lifecycle & Orchestration

### 4.1 Agent Definition Schema

```jsonc
{
  "agent_id": "sales-researcher-v2",
  "display_name": "Sales Research Agent",
  "description": "Gathers company intelligence and prepares prospect briefs.",
  "model_preference": ["claude-sonnet-4-6", "gpt-4o"],
  "skills": ["web-search", "doc-summarizer", "crm-lookup"],
  "max_turns": 25,
  "timeout_seconds": 300,
  "memory_policy": "summarize-on-close",
  "rbac_required_role": "sales-team",
  "platform_constraints": ["any"]
}
```

### 4.2 Lifecycle States

```
DEFINED ──► PROVISIONING ──► READY ──► RUNNING ──► COMPLETING ──► ARCHIVED
                                          │             │
                                          ▼             ▼
                                       ERRORED      CANCELLED
```

- **DEFINED** — Agent config exists in Firestore but has not been invoked.
- **PROVISIONING** — Orchestrator is loading skills, attaching memory, and building the system prompt.
- **READY** — Agent session is hydrated and waiting for the first user message.
- **RUNNING** — Actively processing turns. Heartbeat every 10 s.
- **COMPLETING** — Final turn executed; memory summarization in progress.
- **ARCHIVED** — Session stored for audit; compute resources released.
- **ERRORED / CANCELLED** — Terminal states with metadata capture.

### 4.3 Multi-Agent Workflows (DAG Engine)

Complex business tasks are modeled as directed acyclic graphs (DAGs).

```yaml
# Example: Prospect Research Workflow
workflow:
  id: prospect-research
  trigger: manual | api
  steps:
    - id: enrich
      agent: company-enricher
      inputs: { company_name: "$trigger.company" }

    - id: news
      agent: news-scanner
      inputs: { company_name: "$trigger.company" }
      parallel_with: enrich

    - id: synthesize
      agent: brief-writer
      inputs:
        enrichment: "$enrich.output"
        news: "$news.output"
      depends_on: [enrich, news]

    - id: review
      agent: human-in-the-loop
      inputs: { draft: "$synthesize.output" }
      depends_on: [synthesize]
```

The Orchestrator evaluates the DAG, dispatches steps to agents (parallelizing where allowed), and collects outputs. If any step fails, configurable retry/fallback policies apply.

---

## 5. Multi-LLM Integration Layer

### 5.1 Canonical Message Format

```jsonc
{
  "messages": [
    {
      "role": "system" | "user" | "assistant" | "tool_result",
      "content": [
        { "type": "text", "text": "..." },
        { "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "..." } },
        { "type": "tool_use", "id": "...", "name": "...", "input": { } },
        { "type": "tool_result", "tool_use_id": "...", "content": "..." }
      ]
    }
  ],
  "tools": [ ],       // Skill definitions in canonical format
  "model": "...",      // Resolved by router
  "max_tokens": 4096,
  "temperature": 0.3
}
```

### 5.2 Provider Adapters

Each adapter translates the canonical format to the provider's native API and back. Adapters are simple, stateless TypeScript modules:

```
src/llm-router/
├── adapters/
│   ├── anthropic.adapter.ts
│   ├── openai.adapter.ts
│   ├── azure-openai.adapter.ts
│   ├── vertex-gemini.adapter.ts
│   └── ollama.adapter.ts
├── router.service.ts         # Preference resolution + fallback
├── cost-tracker.service.ts   # Token accounting
└── adapter.interface.ts      # Contract all adapters implement
```

### 5.3 Model Selection Logic

1. Use the agent's `model_preference` list.
2. Check org-level policy (e.g., "no data to external APIs" forces Vertex or self-hosted).
3. Check rate-limit headroom for the preferred provider.
4. Select the first available model that passes all checks.
5. On failure, cascade down the preference list; if all fail, surface an error to the user.

---

## 6. Skills Framework

### 6.1 Skill Manifest Specification

```jsonc
{
  "skill_id": "web-search",
  "version": "1.2.0",
  "display_name": "Web Search",
  "description": "Performs web searches and returns summarized results.",
  "author": "nexus-core",
  "license": "proprietary",
  "platforms": ["linux", "macos", "windows"],
  "runtime": "python",           // python | node | wasm
  "entry_point": "web_search:execute",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "max_results": { "type": "integer", "default": 5 }
    },
    "required": ["query"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "results": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "url": { "type": "string" },
            "snippet": { "type": "string" }
          }
        }
      }
    }
  },
  "permissions": ["network:outbound"],
  "dependencies": ["requests>=2.31"]
}
```

### 6.2 Core Skills (Shipped with Platform)

| Skill | Description | Platforms |
|---|---|---|
| `web-search` | Internet search via SerpAPI or Brave Search | All |
| `file-reader` | Read and parse local files (PDF, DOCX, CSV, JSON, TXT) | All |
| `file-writer` | Create and write structured documents | All |
| `shell-exec` | Execute allow-listed shell commands in a sandboxed subprocess | All |
| `http-client` | Make authenticated HTTP requests to approved endpoints | All |
| `crm-lookup` | Query connected CRM (Salesforce, HubSpot) | All |
| `email-send` | Draft and send emails via approved SMTP/API | All |
| `calendar-manage` | Read/create calendar events via Google/Microsoft Calendar APIs | All |
| `code-interpreter` | Execute Python/JS code in an isolated sandbox | Linux, macOS |
| `doc-summarizer` | Summarize long documents using the configured LLM | All |

### 6.3 Skill Installation Flow

```
User/Admin ──► Skill Registry API ──► Validate manifest ──► Store artifact
                                                                │
     Agent at runtime ◄── Orchestrator fetches ◄── Resolve deps ◄─┘
         │
         ▼
  Load into sandbox ──► Available for tool_use calls
```

Skills can be installed via the CLI (`nexus skill install ./my-skill/`) or the UI (drag-and-drop upload). The registry validates the manifest, scans the artifact for disallowed syscalls, and publishes it. Agents see the new skill immediately on their next session without any service redeployment.

---

## 7. Communication & Security

### 7.1 Transport Security

| Path | Protocol | Encryption |
|---|---|---|
| User → API Gateway | HTTPS/2 | TLS 1.3 (Firebase Hosting CDN edge termination) |
| API Gateway → Internal Services | gRPC | mTLS with GCP-managed certificates |
| Internal Services → Pub/Sub | gRPC | mTLS (GCP native) |
| Cloud → Agent Runtimes | gRPC | mTLS with client certificate pinning |
| Agent Runtime → LLM Providers | HTTPS | TLS 1.3 |

### 7.2 Authentication & Authorization

| Actor | Mechanism | Details |
|---|---|---|
| End users | Firebase Auth (OIDC) | Supports Google, Microsoft, SAML SSO. JWT validated at API Gateway. |
| Service accounts | GCP Workload Identity | No static keys; identity federated from Cloud Run metadata. |
| Agent runtimes | mTLS client certs | Issued by a private CA in Certificate Authority Service. Rotated every 24 h. |
| CLI users | OAuth 2.0 device flow | `nexus login` opens browser for consent; token stored in OS keyring. |

### 7.3 RBAC Model

Roles are stored in Firestore under `/orgs/{orgId}/roles/`.

| Role | Permissions |
|---|---|
| `viewer` | Read agent definitions, view run history |
| `operator` | All viewer + trigger agent runs, view outputs |
| `developer` | All operator + create/edit agents, install skills |
| `admin` | All developer + manage users, configure LLM providers, view audit logs |
| `owner` | All admin + billing, delete org |

Permissions are enforced at three layers: API Gateway (coarse), Orchestrator (fine-grained per agent), and Skill sandbox (per-skill permission grants).

### 7.4 Secrets Management

- All LLM API keys, database credentials, and signing keys stored in **Google Secret Manager**.
- Retrieved at service cold-start via Workload Identity (no key files on disk).
- Rotated automatically via Secret Manager rotation policies + Cloud Functions triggers.
- Agent runtimes never hold provider API keys — they call the LLM Router, which holds keys server-side.

### 7.5 Audit Logging

Every significant action is logged to Firestore (`/orgs/{orgId}/audit/`) and mirrored to Cloud Logging:

- User logins, role changes, agent definition changes.
- Agent session start/stop, every LLM call (model, token count, cost — not prompt content by default).
- Skill installations, permission grants.
- All administrative actions.

Retention: 90 days hot (Firestore), 1 year cold (Cloud Storage via export).

---

## 8. Memory Architecture

### 8.1 Kernel Memory (Hot — Redis)

Purpose: The agent's working scratchpad during a session.

```jsonc
{
  "session_id": "ses_abc123",
  "agent_id": "sales-researcher-v2",
  "scratchpad": "Currently researching Acme Corp. Found 3 recent articles...",
  "turn_history": [
    { "role": "user", "summary": "Research Acme Corp for our Q2 outreach" },
    { "role": "assistant", "summary": "Found company profile, 3 news items, 2 SEC filings" }
  ],
  "metadata": {
    "created_at": "2026-03-22T14:00:00Z",
    "last_active": "2026-03-22T14:03:22Z",
    "token_budget_remaining": 6200
  }
}
```

**Target size:** < 8 KB per session. Turn history stores summaries, not full transcripts.  
**Eviction:** Session memory is flushed when the agent reaches COMPLETING state. A summarizer agent distills it into long-term memory before deletion.

### 8.2 Long-Term Memory (Warm — Firestore + Vector Search)

Purpose: Cross-session knowledge that persists across agent invocations.

```jsonc
// Firestore: /orgs/{orgId}/memory/{memoryId}
{
  "agent_id": "sales-researcher-v2",
  "user_id": "user_jane",
  "summary": "Acme Corp: $42M ARR, Series C, expanding EMEA. CEO = John Smith. Key competitor: Globex.",
  "embedding": [0.012, -0.045, ...],    // 768-dim from Vertex AI text-embedding
  "tags": ["prospect", "acme-corp"],
  "created_at": "2026-03-22T14:05:00Z",
  "ttl": "2026-09-22T14:05:00Z"         // 6-month default; configurable per org
}
```

**Retrieval:** At session start, the Orchestrator queries Vertex AI Vector Search with the current task description to pull the top-K most relevant memories into the agent's context window.

---

## 9. Frontend Application

### 9.1 Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React 19 + Next.js 15 (App Router) | Server components for fast initial load; streaming for agent output |
| Styling | Tailwind CSS 4 + shadcn/ui | Consistent design system with accessible primitives |
| State | Zustand + React Query | Lightweight, no boilerplate; React Query for server state cache |
| Real-time | SSE via EventSource API | Simple, HTTP/2 compatible, auto-reconnect |
| Hosting | Firebase Hosting | CDN-edge serving, automatic SSL, preview channels for PRs |
| Auth | Firebase Auth SDK | Drop-in UI components for login, SSO, MFA |

### 9.2 Page Map

```
/login                 — Firebase Auth login (Google, Microsoft, SAML SSO)
/                      — Dashboard / splash (agent activity feed, system health)
/agents                — Agent catalog (browse, search, create, edit definitions)
/agents/:id            — Agent detail (config, run history, memory explorer)
/agents/:id/run        — Interactive agent session (chat interface with streaming output)
/workflows             — Workflow DAG editor (visual node graph)
/workflows/:id/runs    — Workflow run history and logs
/skills                — Skill marketplace (browse, install, manage)
/settings              — Org settings: LLM providers, RBAC, billing, audit log viewer
/settings/users        — User management (invite, assign roles, deactivate)
/settings/providers    — LLM provider configuration (API keys stored in Secret Manager)
```

### 9.3 CLI Parity

Every UI action has a CLI equivalent for headless and CI/CD environments.

```bash
nexus login                              # OAuth device flow
nexus agents list                        # List agents
nexus agents run sales-researcher-v2 \
  --input '{"company":"Acme Corp"}'      # Trigger a run
nexus workflows run prospect-research \
  --input '{"company":"Acme Corp"}'      # Trigger a workflow
nexus skills install ./my-skill/         # Install a skill
nexus skills list                        # List installed skills
nexus config set llm.default claude-sonnet-4-6
nexus logs --agent sales-researcher-v2 --last 1h
```

**CLI implementation:** TypeScript (compiled to a single binary via `pkg` or distributed as an npm global). Uses the same API Gateway endpoints as the UI.

---

## 10. Cross-Platform Agent Runtime

### 10.1 Overview

The agent runtime is a lightweight process that runs on enterprise endpoints (developer workstations, CI servers, on-prem machines) and connects back to the Nexus cloud hub to receive task assignments and execute skills locally.

**This is not a remote-access tool.** The runtime:
- Initiates all connections outbound to the hub (no inbound ports opened).
- Only executes skills that the administrator has allow-listed for that runtime.
- Runs as a standard user-space process (no root/admin required).
- Has no shell access or command injection surface — skills are pre-packaged and sandboxed.

### 10.2 Architecture

```
┌────────────────────────────────────────┐
│           Agent Runtime Process         │
│                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │  gRPC     │  │  Skill   │  │ Mem  │ │
│  │  Client   │  │  Sandbox │  │ Cache│ │
│  │  (mTLS)   │  │  (gVisor │  │      │ │
│  │           │  │   / proc │  │      │ │
│  │           │  │   jail)  │  │      │ │
│  └─────┬─────┘  └──────────┘  └──────┘ │
│        │ outbound only                  │
└────────┼────────────────────────────────┘
         │ gRPC + mTLS
         ▼
   Nexus Cloud Hub (Cloud Run)
```

### 10.3 Packaging

| Platform | Format | Install |
|---|---|---|
| Linux | `.deb` / `.rpm` / Snap / Docker | `curl -sSL install.nexus.dev \| bash` |
| macOS | `.pkg` / Homebrew | `brew install nexus-runtime` |
| Windows | `.msi` / WinGet / Chocolatey | `winget install Nexus.Runtime` |

Single binary (~20 MB) with embedded Python runtime for skill execution. No external dependencies.

### 10.4 Security Constraints

- **Allow-list only:** The runtime will only execute skills whose `skill_id` appears in its configuration file, which is managed by org admins.
- **No arbitrary code execution:** The `shell-exec` skill (if enabled) only runs commands from a curated allow-list (e.g., `git status`, `docker ps`), not arbitrary user input.
- **Certificate pinning:** The runtime pins the hub's TLS certificate; it will not connect to impersonation endpoints.
- **Auto-update:** Signed binaries fetched from Artifact Registry; verified with cosign before replacement.

---

## 11. Deployment Strategy

### 11.1 GCP Services Map

| Component | GCP Service | Scaling |
|---|---|---|
| React UI | Firebase Hosting | CDN, automatic |
| API Gateway | Cloud Run | 0 → 100 instances, concurrency 80 |
| Orchestrator | Cloud Run | 0 → 50 instances, concurrency 20 (CPU-bound) |
| LLM Router | Cloud Run | 0 → 100 instances, concurrency 100 |
| Skill Registry API | Cloud Run | 0 → 20 instances |
| Memory Writer | Cloud Functions (2nd gen) | Event-triggered from Pub/Sub |
| Event Bus | Cloud Pub/Sub | Managed, unlimited throughput |
| Kernel Memory | Memorystore (Redis) | 1 GB basic tier, scales to HA |
| Long-Term Memory | Firestore | Native mode, auto-scaling |
| Vector Search | Vertex AI Vector Search | Managed index, stream updates |
| Skill Artifacts | Artifact Registry | Managed container/package store |
| Secrets | Secret Manager | Managed |
| Certificates | Certificate Authority Service | Private CA for mTLS |
| Logging | Cloud Logging + Cloud Monitoring | Managed |

### 11.2 Infrastructure as Code

All infrastructure defined in **Terraform** with the following module structure:

```
infra/
├── main.tf
├── variables.tf
├── outputs.tf
├── environments/
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── prod.tfvars
├── modules/
│   ├── firebase-hosting/
│   ├── cloud-run-services/
│   ├── pubsub/
│   ├── firestore/
│   ├── memorystore/
│   ├── secret-manager/
│   ├── certificate-authority/
│   ├── artifact-registry/
│   └── monitoring/
```

### 11.3 CI/CD Pipeline

```
Push to main ──► GitHub Actions ──► Lint + Test ──► Build containers
                                                        │
                              ┌──────────────────────────┤
                              ▼                          ▼
                      Deploy to Staging           Firebase Preview Channel
                              │
                       Integration Tests
                              │
                       Manual Approval
                              │
                       Deploy to Prod ──► Canary (10%) ──► Full rollout
```

### 11.4 Estimated Monthly Cost (Starter Tier)

| Resource | Estimate |
|---|---|
| Cloud Run (all services) | $80–$200 (scales to zero) |
| Firestore | $25–$75 |
| Memorystore Redis (1 GB) | $35 |
| Pub/Sub | $5–$15 |
| Firebase Hosting | $0 (within free tier for most) |
| Secret Manager | $1 |
| LLM API costs | Variable ($100–$5,000+ depending on usage) |
| **Total (excl. LLM)** | **~$150–$330/mo** |

---

## 12. Documentation Standards

### 12.1 Documentation Types

| Document | Location | Format | Audience |
|---|---|---|---|
| Architecture Decision Records (ADRs) | `docs/adr/` | Markdown | Engineering |
| API Reference | Auto-generated from OpenAPI spec | Redoc/Swagger | Developers |
| Skill Development Guide | `docs/skills/` | Markdown | Skill authors |
| Operator Runbook | `docs/runbook/` | Markdown | DevOps/SRE |
| User Guide | Firebase Hosting `/docs` | Docusaurus | End users |
| Onboarding Guide | `docs/onboarding/` | Markdown | New team members |
| Security Whitepaper | `docs/security/` | PDF (generated) | Compliance/CISO |

### 12.2 Documentation Requirements

- Every PR that changes public API surface must include updated OpenAPI spec.
- Every new skill must include a `README.md` in its package with usage examples.
- ADRs are required for any architectural decision with more than one viable option.
- Runbook entries are required for every alert/monitor.
- All documentation is versioned alongside code in the monorepo.

---

## 13. Project Phases & Milestones

### Phase 1 — Foundation (Weeks 1–4)

- [ ] GCP project setup, Terraform modules for core infra
- [ ] Firebase Hosting + Auth configured
- [ ] API Gateway (NestJS) with health check, auth middleware, RBAC
- [ ] Firestore schema: orgs, users, roles, agent definitions
- [ ] CI/CD pipeline (GitHub Actions → Cloud Run)
- [ ] ADR-001: Architecture overview
- [ ] ADR-002: LLM routing strategy

**Exit criteria:** Authenticated user can log in, see dashboard, and call a health endpoint.

### Phase 2 — Agent Engine (Weeks 5–8)

- [ ] Orchestrator service with AutoGen integration
- [ ] LLM Router with Claude and OpenAI adapters
- [ ] Pub/Sub event bus wired between services
- [ ] Single-agent session lifecycle (DEFINED → ARCHIVED)
- [ ] Kernel memory (Redis) + memory writer
- [ ] 3 core skills: `web-search`, `file-reader`, `doc-summarizer`
- [ ] Agent run UI page (streaming chat)

**Exit criteria:** User can trigger an agent run from the UI, observe streaming output, and see it archived.

### Phase 3 — Multi-Agent & Workflows (Weeks 9–12)

- [ ] DAG engine for multi-agent workflows
- [ ] Workflow definition UI (visual editor)
- [ ] Parallel execution support
- [ ] Long-term memory + vector search
- [ ] Azure OpenAI and Vertex AI adapters
- [ ] 5 additional core skills
- [ ] CLI v1.0

**Exit criteria:** Multi-step workflow runs end-to-end; CLI has parity with core UI functions.

### Phase 4 — Runtime & Skills Marketplace (Weeks 13–16)

- [ ] Cross-platform agent runtime (Linux, macOS, Windows)
- [ ] mTLS certificate provisioning for runtimes
- [ ] Skill Registry API + install flow
- [ ] Skill sandboxing on runtime
- [ ] Runtime auto-update mechanism
- [ ] Security whitepaper draft

**Exit criteria:** Agent runtime installed on all three platforms can execute a skill dispatched from the cloud hub.

### Phase 5 — Hardening & Launch Prep (Weeks 17–20)

- [ ] Penetration testing
- [ ] Load testing (target: 100 concurrent agent sessions)
- [ ] Observability dashboards (Cloud Monitoring)
- [ ] Alerting and runbook
- [ ] User guide on Docusaurus
- [ ] Billing integration
- [ ] Beta release to internal teams

**Exit criteria:** System passes security review and handles target load with p99 latency < 3 s for agent responses (excluding LLM inference time).

---

## 14. Security Hardening (Audit Remediation)

The following items address gaps identified during the security audit and must be incorporated into the relevant phases.

### 14.1 Network & Infrastructure

| Gap | Remediation |
|---|---|
| No VPC / network segmentation | Deploy all Cloud Run services with **VPC Connector** into a private VPC. Only the API Gateway has a public ingress; all internal services use **Private Google Access** and internal-only Cloud Run URLs. |
| No WAF / DDoS protection | Enable **Cloud Armor** on the external load balancer in front of the API Gateway. Configure OWASP ModSecurity Core Rule Set + rate-based rules. |
| Redis unencrypted at rest | Use **Memorystore for Redis (Standard tier)** with in-transit encryption enabled. Enable AUTH via Secret Manager-stored password. |
| `curl \| bash` install pattern | Remove pipe-to-bash installer. Distribute agent runtime exclusively via signed packages (`.deb`, `.rpm`, `.pkg`, `.msi`) and verified package managers (Homebrew, WinGet, Snap). Provide SHA-256 checksums on a TLS-only download page. |

### 14.2 Application Security

| Gap | Remediation |
|---|---|
| No CSRF protection | Add **SameSite=Strict** cookies and synchronizer token pattern for any state-changing requests from the web UI. NestJS `csurf` middleware or custom double-submit cookie. |
| No CSP headers | Configure **Content-Security-Policy**, **X-Frame-Options: DENY**, **X-Content-Type-Options: nosniff**, and **Referrer-Policy: strict-origin-when-cross-origin** on Firebase Hosting and API Gateway responses. |
| SSE token refresh | SSE connections must include a JWT expiry check. The server closes connections whose JWT is within 60 s of expiry; the client automatically reconnects with a refreshed token. |
| Prompt injection | Implement an **input/output guardrail layer** in the Orchestrator: (1) sanitize tool outputs before injecting into the LLM context, (2) tag untrusted content with delimiters the system prompt instructs the model to treat as data, (3) apply output classifiers to detect attempted instruction override. See ADR-003. |
| `code-interpreter` risk | Run `code-interpreter` in a **dedicated gVisor sandbox** with no network access, 30 s timeout, 256 MB memory cap, and read-only filesystem except a scoped `/tmp`. Kill the container after each execution. |

### 14.3 Data Protection

| Gap | Remediation |
|---|---|
| No data classification | Implement a **data classification policy** (Public, Internal, Confidential, Restricted). Tag Firestore collections and memory entries with classification level. Org-level policy can block Confidential/Restricted data from being sent to external LLM providers (forces Vertex AI or self-hosted). |
| No DLP | Add a **DLP scanning step** in the LLM Router: outbound prompts are checked against Cloud DLP API for PII (SSN, credit cards, etc.) before leaving the platform. Matches are redacted or blocked per org policy. |
| Audit log integrity | Hash-chain audit log entries (each entry includes `SHA-256(previous_entry + current_entry)`). Export daily digests to a **write-once Cloud Storage bucket** with retention lock for tamper evidence. |

### 14.4 Skill Supply-Chain Security

- All skill artifacts must be **cryptographically signed** (cosign / Sigstore) before upload to Artifact Registry.
- The Orchestrator verifies signatures at load time; unsigned or invalid skills are rejected.
- Skill manifests declare required permissions; the platform enforces them at the sandbox level. Skills cannot request permissions not declared in their manifest.
- Dependency scanning (Snyk / Dependabot) runs on every skill artifact before publishing.

### 14.5 Additional ADRs Required

- **ADR-003:** Prompt injection mitigation strategy
- **ADR-004:** Data classification and DLP policy
- **ADR-005:** Stripe billing integration and PCI compliance

---

## 15. Stripe Billing Integration

### 15.1 Overview

Nexus uses **Stripe** as its billing and subscription management platform. Stripe handles payment processing, subscription lifecycle, invoicing, and usage-based metering — keeping Nexus outside PCI scope via Stripe Elements (no raw card data touches Nexus servers).

### 15.2 Subscription Tiers

| Tier | Monthly Price | Included | Overage |
|---|---|---|---|
| **Starter** | $49/mo | 3 users, 5 agents, 1,000 agent runs, 500K LLM tokens | $0.05/run, $0.002/1K tokens |
| **Team** | $199/mo | 15 users, 25 agents, 10,000 agent runs, 5M LLM tokens | $0.04/run, $0.0015/1K tokens |
| **Enterprise** | Custom | Unlimited users/agents, custom SLA, dedicated support, SSO/SAML, data residency | Negotiated |

### 15.3 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Nexus Platform                            │
│                                                                  │
│  ┌────────────┐    ┌──────────────────┐    ┌─────────────────┐  │
│  │  Settings   │    │  API Gateway     │    │  Billing        │  │
│  │  Portal     │───►│  /api/v1/billing │───►│  Service        │  │
│  │  (Stripe    │    │                  │    │  (Cloud Run)    │  │
│  │   Elements) │    │  /api/v1/stripe  │    │                 │  │
│  └────────────┘    │  /webhooks       │    │  - Subscription │  │
│                    └──────────────────┘    │    mgmt          │  │
│  ┌────────────┐                           │  - Usage meter   │  │
│  │  Billing    │                           │  - Invoice sync  │  │
│  │  Splash     │                           └────────┬────────┘  │
│  │  Page       │                                    │            │
│  └────────────┘                                    │            │
│                                                     ▼            │
│                                              ┌────────────┐     │
│                                              │  Firestore  │     │
│                                              │  (billing   │     │
│                                              │   state)    │     │
│                                              └──────┬──────┘     │
└─────────────────────────────────────────────────────┼────────────┘
                                                      │
                                    ┌─────────────────▼───────────┐
                                    │         Stripe API           │
                                    │                              │
                                    │  - Customers                 │
                                    │  - Subscriptions             │
                                    │  - Payment Methods           │
                                    │  - Usage Records             │
                                    │  - Invoices                  │
                                    │  - Billing Portal            │
                                    │  - Webhooks                  │
                                    └──────────────────────────────┘
```

### 15.4 Stripe Webhook Workflow

The Billing Service exposes a webhook endpoint (`POST /api/v1/stripe/webhooks`) verified using Stripe's webhook signature (`Stripe-Signature` header + webhook secret from Secret Manager).

**Critical webhook events handled:**

| Event | Action |
|---|---|
| `checkout.session.completed` | Provision org subscription in Firestore, assign tier |
| `customer.subscription.updated` | Update tier, adjust entitlements (users, agents, runs) |
| `customer.subscription.deleted` | Downgrade to free/read-only mode, notify org admins |
| `invoice.payment_succeeded` | Record payment, reset monthly usage counters |
| `invoice.payment_failed` | Send dunning notification, enter grace period (7 days) |
| `customer.subscription.trial_will_end` | Notify org admins 3 days before trial ends |

**Webhook security:**

- Signature verification using `stripe.webhooks.constructEvent()` with the signing secret.
- Idempotency: each event includes a unique `event.id`; Firestore tracks processed events to prevent replay.
- Webhook endpoint is rate-limited separately from main API.
- Failed webhook processing triggers a dead-letter queue (Pub/Sub) for retry and alerting.

### 15.5 Usage-Based Metering

The Orchestrator emits usage events to Pub/Sub on each agent run completion:

```jsonc
{
  "org_id": "org_abc",
  "event": "agent_run_completed",
  "agent_id": "sales-researcher-v2",
  "tokens_used": { "input": 2340, "output": 890 },
  "timestamp": "2026-03-22T14:05:00Z"
}
```

A Cloud Function aggregates these events and reports usage to Stripe via `stripe.subscriptionItems.createUsageRecord()` for end-of-billing-cycle invoicing.

### 15.6 Settings Portal — Billing Configuration

Accessible at `/settings/billing` (requires `owner` or `admin` role).

**Features:**

| Section | Description |
|---|---|
| **Current Plan** | Shows active tier, renewal date, included vs. used entitlements (progress bars) |
| **Payment Method** | Stripe Elements card input — tokenized client-side, never touches Nexus servers |
| **Invoices** | List of past invoices with PDF download links (via Stripe Invoice API) |
| **Usage Dashboard** | Real-time usage charts: agent runs, LLM tokens, active users — per billing cycle |
| **Upgrade / Downgrade** | One-click tier change via Stripe Checkout Session with proration |
| **Billing Portal** | Link to Stripe Customer Portal for self-service (update card, cancel, manage invoices) |
| **Billing Alerts** | Configure email alerts at 50%, 80%, 100% of included usage thresholds |

**Implementation:**

- Payment method collection uses **Stripe Elements** (`@stripe/react-stripe-js`) — embedded directly in the settings page. Card data is tokenized by Stripe.js and sent directly to Stripe. Nexus backend never sees raw card numbers.
- Plan changes use **Stripe Checkout Sessions** in `mode: 'subscription'` with `proration_behavior: 'always_invoice'`.
- Self-service management uses **Stripe Customer Portal** (`stripe.billingPortal.sessions.create()`).

### 15.7 Billing Splash Page

Accessible at `/billing` (public, unauthenticated) and linked from the marketing site and login page.

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│  NEXUS — Enterprise Agent Orchestration                       │
│                                                              │
│  "AI agents that work the way your enterprise does."          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   STARTER    │  │     TEAM     │  │  ENTERPRISE  │       │
│  │              │  │              │  │              │       │
│  │   $49/mo     │  │   $199/mo    │  │   Custom     │       │
│  │              │  │              │  │              │       │
│  │  3 users     │  │  15 users    │  │  Unlimited   │       │
│  │  5 agents    │  │  25 agents   │  │  Custom SLA  │       │
│  │  1K runs/mo  │  │  10K runs/mo │  │  SSO/SAML    │       │
│  │  500K tokens │  │  5M tokens   │  │  Dedicated   │       │
│  │              │  │              │  │  support     │       │
│  │ [Start Free  │  │ [Start Free  │  │ [Contact     │       │
│  │  Trial]      │  │  Trial]      │  │  Sales]      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ── Feature Comparison Table ──                              │
│  ── FAQ Section ──                                           │
│  ── "Trusted by" logos ──                                    │
│                                                              │
│  [Sign Up Free — 14-day trial, no credit card required]      │
└──────────────────────────────────────────────────────────────┘
```

**Key elements:**

- Tier comparison cards with clear CTAs → Stripe Checkout Session
- Feature comparison matrix (agents, skills, LLM providers, support level, SLA)
- FAQ addressing common billing questions (proration, cancellation, data retention on downgrade)
- 14-day free trial with no credit card (card collected at conversion via Stripe Checkout)
- Enterprise tier links to a contact form / Calendly scheduling

### 15.8 PCI Compliance

Nexus maintains **PCI DSS SAQ-A** compliance (the lightest level) because:

- All payment data is collected via **Stripe Elements** (Stripe-hosted iframes).
- No card numbers, CVVs, or sensitive auth data are transmitted to, processed by, or stored on Nexus infrastructure.
- The Stripe.js library loads from `js.stripe.com` — a PCI Level 1 certified origin.
- The Billing Service only stores Stripe Customer IDs and Subscription IDs (non-sensitive tokens) in Firestore.

### 15.9 Stripe Configuration Secrets

| Secret | Stored In | Used By |
|---|---|---|
| `STRIPE_SECRET_KEY` | Secret Manager | Billing Service (server-side) |
| `STRIPE_PUBLISHABLE_KEY` | Build-time env var | Frontend (client-side, safe to expose) |
| `STRIPE_WEBHOOK_SECRET` | Secret Manager | API Gateway webhook endpoint |
| `STRIPE_PRICE_ID_STARTER` | Firestore `/config/billing` | Billing Service |
| `STRIPE_PRICE_ID_TEAM` | Firestore `/config/billing` | Billing Service |

---

## 16. Updated Page Map

The frontend page map (Section 9.2) is extended with billing pages:

```
/billing               — Public billing splash page (pricing tiers, feature comparison, CTAs)
/settings/billing      — Billing settings (current plan, payment method, invoices, usage)
/settings/billing/usage — Detailed usage analytics (agent runs, tokens, per-agent breakdown)
/settings/stripe       — Stripe integration configuration (admin: webhook status, key rotation)
```

---

## 17. Updated Project Phases (Stripe Integration)

Stripe integration items are added to existing phases:

**Phase 1 — Foundation (add):**

- [ ] Stripe account setup + API key provisioning in Secret Manager
- [ ] Firestore billing schema: `/orgs/{orgId}/billing/`, `/orgs/{orgId}/invoices/`
- [ ] Billing splash page (static, deployed with frontend)

**Phase 2 — Agent Engine (add):**

- [ ] Billing Service (Cloud Run) — Stripe Customer + Subscription CRUD
- [ ] Stripe webhook endpoint with signature verification
- [ ] Settings portal billing tab (Stripe Elements for payment, plan display)

**Phase 3 — Multi-Agent & Workflows (add):**

- [ ] Usage metering pipeline (Pub/Sub → Cloud Function → Stripe Usage Records)
- [ ] Usage dashboard in settings portal
- [ ] Billing alerts (50%, 80%, 100% thresholds)
- [ ] Stripe Customer Portal integration

**Phase 5 — Hardening (add):**

- [ ] PCI SAQ-A self-assessment completion
- [ ] Stripe webhook failure alerting + dead-letter queue monitoring
- [ ] Billing load testing (simulate subscription churn, usage spikes)
- [ ] ADR-005: Stripe billing integration and PCI compliance

---

## 18. Appendices

### A. Repository Structure

```
nexus/
├── apps/
│   ├── web/                  # Next.js React frontend
│   ├── cli/                  # TypeScript CLI
│   └── runtime/              # Cross-platform agent runtime
├── services/
│   ├── api-gateway/          # NestJS API Gateway
│   ├── orchestrator/         # Python AutoGen-based engine
│   ├── llm-router/           # TypeScript LLM proxy
│   ├── skill-registry/       # Skill catalog API
│   └── memory-service/       # Memory writer + query
├── packages/
│   ├── shared-types/         # Canonical TypeScript types
│   ├── proto/                # gRPC protobuf definitions
│   └── sdk/                  # Nexus SDK for skill authors
├── skills/
│   ├── core/                 # Built-in skills
│   └── examples/             # Example community skills
├── infra/                    # Terraform modules
├── docs/                     # All documentation
│   ├── adr/
│   ├── skills/
│   ├── runbook/
│   └── security/
├── .github/workflows/        # CI/CD
└── turbo.json                # Monorepo orchestration (Turborepo)
```

### B. Key Technology Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo tool | Turborepo | Fast, minimal config, good TypeScript support |
| Agent framework | Microsoft AutoGen 0.4 | Mature multi-agent patterns, tool-use protocol, active community |
| API framework | NestJS | Enterprise-grade DI, guards, interceptors, OpenAPI generation |
| Frontend | Next.js 15 + React 19 | Server components, streaming, Firebase integration |
| IaC | Terraform | Multi-cloud capable, strong GCP provider, state management |
| Container registry | GCP Artifact Registry | Native Cloud Run integration, vulnerability scanning |
| Package manager | pnpm (JS) + uv (Python) | Fast, disk-efficient, lockfile integrity |

### C. Security Compliance Checklist

- [ ] SOC 2 Type II alignment (audit logging, access controls, encryption)
- [ ] GDPR data residency (Firestore regional config, no PII in logs)
- [ ] OWASP Top 10 mitigations in API Gateway
- [ ] Dependency scanning (Dependabot + Snyk)
- [ ] Container image scanning (Artifact Registry automatic scanning)
- [ ] Secret rotation policies (90-day max for all credentials)
- [ ] Incident response plan documented in runbook
