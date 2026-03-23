# Firestore Schema

## Collections

### `/orgs/{orgId}`
Organization root document.
```json
{
  "name": "string",
  "created_at": "timestamp",
  "settings": {
    "default_model": "string",
    "allowed_providers": ["string"],
    "data_classification_policy": "string"
  }
}
```

### `/orgs/{orgId}/users/{userId}`
```json
{
  "email": "string",
  "display_name": "string",
  "role": "viewer | operator | developer | admin | owner",
  "created_at": "timestamp",
  "last_login": "timestamp"
}
```

### `/orgs/{orgId}/agents/{agentId}`
```json
{
  "display_name": "string",
  "description": "string",
  "model_preference": ["string"],
  "skills": ["string"],
  "max_turns": "number",
  "timeout_seconds": "number",
  "memory_policy": "summarize-on-close | discard | retain-full",
  "rbac_required_role": "string",
  "platform_constraints": ["string"],
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "created_by": "string"
}
```

### `/orgs/{orgId}/agents/{agentId}/sessions/{sessionId}`
```json
{
  "state": "DEFINED | PROVISIONING | READY | RUNNING | COMPLETING | ARCHIVED | ERRORED | CANCELLED",
  "started_at": "timestamp",
  "completed_at": "timestamp | null",
  "triggered_by": "string",
  "error": "string | null"
}
```

### `/orgs/{orgId}/roles/{roleId}`
```json
{
  "role_name": "string",
  "permissions": ["string"]
}
```

### `/orgs/{orgId}/audit/{entryId}`
```json
{
  "actor_id": "string",
  "action": "string",
  "resource_type": "string",
  "resource_id": "string",
  "details": {},
  "timestamp": "timestamp",
  "previous_hash": "string",
  "hash": "string"
}
```

### `/orgs/{orgId}/billing/state`
```json
{
  "tier": "starter | team | enterprise",
  "stripe_customer_id": "string",
  "stripe_subscription_id": "string",
  "current_period_start": "timestamp",
  "current_period_end": "timestamp",
  "usage": {
    "agent_runs": "number",
    "llm_tokens": "number",
    "active_users": "number"
  },
  "limits": {
    "max_agent_runs": "number",
    "max_llm_tokens": "number",
    "max_users": "number",
    "max_agents": "number"
  }
}
```

### `/orgs/{orgId}/invoices/{invoiceId}`
```json
{
  "stripe_invoice_id": "string",
  "amount": "number",
  "currency": "string",
  "status": "paid | failed | pending",
  "period_start": "timestamp",
  "period_end": "timestamp",
  "pdf_url": "string"
}
```

### `/orgs/{orgId}/memory/{memoryId}`
```json
{
  "agent_id": "string",
  "user_id": "string",
  "summary": "string",
  "embedding": ["number"],
  "tags": ["string"],
  "created_at": "timestamp",
  "ttl": "timestamp"
}
```

### `/config/billing`
Global billing configuration (price IDs, tier definitions).
```json
{
  "stripe_price_id_starter": "string",
  "stripe_price_id_team": "string",
  "tiers": {
    "starter": { "max_users": 3, "max_agents": 5, "max_runs": 1000, "max_tokens": 500000 },
    "team": { "max_users": 15, "max_agents": 25, "max_runs": 10000, "max_tokens": 5000000 }
  }
}
```

## Indexes

| Collection | Fields | Order |
|---|---|---|
| `/orgs/{orgId}/agents` | `created_at` | DESC |
| `/orgs/{orgId}/audit` | `timestamp` | DESC |
| `/orgs/{orgId}/audit` | `action`, `timestamp` | ASC, DESC |
| `/orgs/{orgId}/agents/{agentId}/sessions` | `started_at` | DESC |
