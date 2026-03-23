# ADR-004: Data Classification and DLP Policy

**Date:** 2025-07-10

**Status:** Accepted

## Context

The platform processes data of varying sensitivity levels on behalf of tenants. Data flows through LLM prompts, tool outputs, conversation histories, and agent configurations. Without a clear classification scheme, sensitive data may inadvertently be sent to external LLM providers, logged in plaintext, or exposed through agent responses.

Regulatory and contractual obligations (GDPR, SOC 2, customer DPAs) require that we demonstrate control over how data is classified, where it is processed, and how it is protected at each stage.

Additionally, some tenants operate in regulated industries (healthcare, finance) and require that certain data never leaves a specific cloud region or is never processed by third-party LLM APIs.

## Decision

We will implement a **4-tier data classification system** with automated DLP scanning and policy-driven routing.

### Classification Tiers

| Tier | Label | Description | Examples |
|------|-------|-------------|----------|
| 1 | **Public** | Non-sensitive, can be freely shared | Marketing copy, public documentation, open-source code |
| 2 | **Internal** | Not sensitive but not intended for public disclosure | Internal wiki content, team discussions, project names |
| 3 | **Confidential** | Business-sensitive, restricted to authorized personnel | Customer lists, revenue data, proprietary algorithms, API keys |
| 4 | **Restricted** | Highly sensitive, subject to regulatory requirements | PII, PHI, financial account numbers, authentication credentials |

### DLP Scanning via Cloud DLP API

All outbound prompts (data being sent to an LLM provider) are scanned using the **Google Cloud DLP API** before transmission:

1. The Orchestrator passes the assembled prompt to the DLP scanning module.
2. The DLP module calls the Cloud DLP API with configured `infoTypes` detectors:
   - `PERSON_NAME`, `EMAIL_ADDRESS`, `PHONE_NUMBER`, `STREET_ADDRESS`
   - `CREDIT_CARD_NUMBER`, `US_SOCIAL_SECURITY_NUMBER`
   - `GCP_CREDENTIALS`, `AUTH_TOKEN`, `PASSWORD`
   - Custom detectors for tenant-specific patterns (e.g., internal ID formats)
3. If Restricted-tier data is detected:
   - The scan result is logged (without the sensitive data itself).
   - The configured policy is applied (see Policy Actions below).

### Policy Actions

Each tenant configures a DLP policy that determines what happens when sensitive data is detected:

| Action | Behavior |
|--------|----------|
| **Block** | Reject the request and return an error to the user. |
| **Redact** | Replace detected sensitive values with placeholder tokens (e.g., `[REDACTED-SSN]`) before sending to the LLM. |
| **Route** | Redirect the request to a compliant provider (e.g., Vertex AI for data that must stay within GCP). |
| **Warn** | Allow the request but log a warning and notify the tenant admin. |

Default policy for new tenants: **Redact** for Restricted-tier data, **Warn** for Confidential-tier data.

### Org-Level Provider Restrictions

Tenant administrators can set org-level policies that restrict which LLM providers may be used:

```json
{
  "tenantId": "tenant_abc",
  "llmPolicy": {
    "allowedProviders": ["vertex-ai"],
    "blockedProviders": ["openai", "anthropic"],
    "reason": "All data must remain within GCP per DPA requirements"
  }
}
```

When an org-level restriction is in place, the LLM Router (see ADR-002) enforces it regardless of agent-level configuration. Requests that cannot be fulfilled by an allowed provider are rejected with a clear error message.

### Data Handling by Tier

| Tier | LLM Routing | Storage | Logging | Retention |
|------|-------------|---------|---------|-----------|
| Public | Any provider | Standard Firestore | Full | Per tenant config |
| Internal | Any provider | Standard Firestore | Full | Per tenant config |
| Confidential | Preferred provider or Vertex AI | Encrypted Firestore | Redacted in logs | 90 days default |
| Restricted | Vertex AI / self-hosted only | Encrypted Firestore with CMEK | No plaintext logging | 30 days default, then purge |

### Classification Assignment

Data classification is assigned at multiple levels:

- **Agent level** -- the agent definition specifies the default classification for data it processes.
- **Tool level** -- each tool declares the classification of its outputs (e.g., a database tool returning customer records is tagged Confidential).
- **Automatic detection** -- the DLP scanner can elevate the classification if it detects data that exceeds the declared level.

## Consequences

### Positive

- **Regulatory compliance** -- the classification scheme and DLP scanning provide auditable controls for GDPR, SOC 2, and HIPAA requirements.
- **Tenant trust** -- tenants can configure policies that match their own compliance requirements, including hard restrictions on provider routing.
- **Defense in depth** -- automatic DLP detection catches sensitive data even when agents or tools fail to classify it correctly.
- **Clear mental model** -- four tiers are simple enough for developers and tenant admins to understand and apply consistently.

### Negative

- **DLP API cost** -- scanning every outbound prompt adds cost; may need to implement caching or sampling for high-volume tenants.
- **Latency** -- DLP scanning adds latency to the prompt pipeline; must be optimized with async scanning where possible.
- **False positives** -- DLP detectors may flag non-sensitive data that resembles sensitive patterns (e.g., fictional SSNs in test data), causing unnecessary blocks or redactions.
- **Classification drift** -- data classification may become stale as tools and agents evolve; requires periodic review and automated re-classification.
