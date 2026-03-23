# ADR-002: Multi-LLM Routing Strategy

**Date:** 2025-06-22

**Status:** Accepted

## Context

The platform must support multiple LLM providers to give tenants flexibility in model selection, enable cost optimization, and provide resilience through fallback chains. Different agents may require different models based on capability, latency, cost, or data residency requirements.

Challenges we must address:

- Each LLM provider has a distinct API contract, authentication mechanism, and message format.
- Tenants need the ability to configure preferred providers and fallback behavior per agent.
- The platform must track token usage and cost per request for accurate billing.
- Rate limits vary by provider and must be respected to avoid service degradation.
- Some tenants require data to remain within specific regions or on specific infrastructure (e.g., Vertex AI for data sovereignty).

## Decision

We will implement a **provider-agnostic LLM Router service** that uses a canonical message format internally and delegates to provider-specific adapters at the boundary.

### Canonical Message Format

All internal communication uses a unified message schema:

```typescript
interface CanonicalMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentBlock[];
  metadata?: {
    toolCallId?: string;
    toolName?: string;
    citations?: Citation[];
  };
}

interface CanonicalRequest {
  messages: CanonicalMessage[];
  model: ModelIdentifier;
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stopSequences?: string[];
  };
  routing: {
    preferredProvider?: ProviderId;
    fallbackChain?: ProviderId[];
    maxCostPerRequest?: number;
    requiredCapabilities?: string[];
  };
}
```

### Adapter Pattern

Each LLM provider is implemented as an adapter that conforms to a common interface:

```typescript
interface LLMAdapter {
  providerId: ProviderId;
  translateRequest(canonical: CanonicalRequest): ProviderRequest;
  translateResponse(response: ProviderResponse): CanonicalResponse;
  estimateCost(request: CanonicalRequest): CostEstimate;
  checkAvailability(): Promise<HealthStatus>;
}
```

**Supported adapters:**

| Adapter | Provider | Use Case |
|---------|----------|----------|
| `AnthropicAdapter` | Anthropic Messages API | Primary for Claude models |
| `OpenAIAdapter` | OpenAI Chat Completions API | GPT-4o, o1 series |
| `AzureOpenAIAdapter` | Azure OpenAI Service | Enterprise customers with Azure commitments |
| `VertexAIAdapter` | Google Vertex AI | Data residency requirements, Gemini models |

### Fallback Chains

When a provider request fails or is unavailable, the router follows a configurable fallback chain:

1. Check rate-limit headroom for the preferred provider (must have at least 10% capacity remaining).
2. If headroom is insufficient or the request fails, move to the next provider in the fallback chain.
3. Translate the canonical request to the fallback provider's format via its adapter.
4. Log the fallback event for observability and billing reconciliation.

Default fallback chain (configurable per tenant):
```
Anthropic -> OpenAI -> Vertex AI
```

### Cost Tracking

Every LLM request produces a usage event published to the `usage.tokens` Pub/Sub topic:

```json
{
  "tenantId": "tenant_abc",
  "agentId": "agent_xyz",
  "runId": "run_123",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "inputTokens": 1520,
  "outputTokens": 430,
  "estimatedCostUsd": 0.0089,
  "timestamp": "2025-06-22T14:30:00Z"
}
```

### Rate-Limit Headroom Checks

Before routing a request to a provider, the router checks a sliding-window counter (stored in Redis / Memorystore) to estimate remaining capacity. If the provider is within 10% of its rate limit, the router preemptively falls back to the next provider in the chain rather than waiting for a 429 response.

## Consequences

### Positive

- **Provider flexibility** -- tenants can switch providers without code changes; the canonical format insulates the orchestrator from provider-specific details.
- **Resilience** -- fallback chains ensure that a single provider outage does not take down the platform.
- **Cost visibility** -- per-request cost tracking enables accurate billing and helps tenants optimize spend.
- **Extensibility** -- adding a new provider requires only implementing the `LLMAdapter` interface and registering it with the router.

### Negative

- **Translation fidelity** -- not all provider features map cleanly to the canonical format; some advanced capabilities (e.g., provider-specific tool-use schemas) may require escape hatches.
- **Latency overhead** -- the routing layer adds a small amount of latency to every LLM call for headroom checks and adapter translation.
- **Adapter maintenance** -- each adapter must be kept in sync with upstream API changes from the respective provider.
- **Cost estimation accuracy** -- token counts are estimated before the request; actual usage may differ slightly, requiring reconciliation.
