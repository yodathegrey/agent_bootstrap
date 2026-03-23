# ADR-001: Platform Architecture Overview

**Date:** 2025-06-15

**Status:** Accepted

## Context

We need to build a scalable, secure agent orchestration platform that supports multiple tenants, handles variable workloads driven by LLM inference, and allows teams to independently develop and deploy services. The platform must accommodate unpredictable burst traffic from agent runs while maintaining strict tenant isolation and data security.

Key requirements that informed this decision:

- Independent scaling of services based on their resource profiles (CPU-bound orchestration vs. I/O-bound LLM calls)
- Strict tenant isolation for data and compute
- Rapid iteration across multiple services by different teams
- Auditability and observability across the full request lifecycle
- Cost-efficient scaling to zero for infrequently used tenants

## Decision

We will adopt a **microservices architecture deployed on Google Cloud Platform (GCP)**, using the following foundational choices:

### Compute: Cloud Run

All services are deployed as stateless containers on Cloud Run. This provides automatic scaling (including scale-to-zero), built-in HTTPS, IAM-based service-to-service authentication, and per-request billing.

Core services:

- **API Gateway** -- public-facing entry point, authentication, rate limiting
- **Orchestrator** -- agent execution engine, tool dispatch, conversation state
- **LLM Router** -- provider selection, fallback logic, cost tracking
- **Billing Service** -- Stripe integration, usage metering, subscription management
- **Skill Registry** -- skill discovery, installation, version management

### Messaging: Cloud Pub/Sub

Services communicate asynchronously via Pub/Sub for event-driven workflows. Synchronous calls use internal Cloud Run service-to-service invocation with IAM authentication.

Key event topics:

- `agent.run.started`, `agent.run.completed`, `agent.run.failed`
- `usage.tokens`, `usage.agent-run`
- `billing.subscription.changed`

### Data: Firestore + Cloud Storage

- **Firestore** -- tenant configuration, agent definitions, conversation history, billing records
- **Cloud Storage** -- skill artifacts, large prompt templates, audit logs

### Monorepo: Turborepo

The entire codebase lives in a single Turborepo monorepo with the following structure:

```
apps/
  web/          # Next.js frontend
  docs/         # Documentation site
services/
  api-gateway/
  orchestrator/
  llm-router/
  billing/
  skill-registry/
packages/
  shared/       # Shared types, utilities, constants
  ui/           # Shared UI component library
  config/       # Shared ESLint, TypeScript configs
```

Turborepo provides incremental builds, remote caching, and dependency-aware task orchestration across all packages.

### Infrastructure: Terraform

All GCP resources are provisioned via Terraform, stored in an `infra/` directory. Environments (dev, staging, prod) are managed through Terraform workspaces and variable files.

## Consequences

### Positive

- **Independent scaling** -- each service scales based on its own traffic patterns; the LLM Router can scale separately from the Billing Service.
- **Deployment isolation** -- a bug in the Skill Registry does not require redeploying the Orchestrator.
- **Cost efficiency** -- Cloud Run scale-to-zero means idle tenants cost nothing at the compute layer.
- **Developer velocity** -- Turborepo caching and parallel builds keep CI fast even as the monorepo grows.
- **Observability** -- Cloud Run integrates natively with Cloud Logging, Cloud Trace, and Cloud Monitoring.

### Negative

- **Operational complexity** -- more services means more deployment pipelines, more dashboards, and more potential points of failure.
- **Network latency** -- synchronous service-to-service calls add latency compared to a monolith; must be managed through careful API design and caching.
- **Distributed debugging** -- tracing a request across multiple services requires disciplined use of correlation IDs and structured logging.
- **Cold starts** -- Cloud Run containers may experience cold-start latency; mitigated with minimum instance counts for critical services.
