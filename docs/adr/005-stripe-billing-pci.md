# ADR-005: Stripe Billing Integration and PCI Compliance

**Date:** 2025-07-18

**Status:** Accepted

## Context

The platform requires a billing system that supports subscription-based pricing tiers, usage-based metering (LLM tokens, agent runs), and self-service payment management. The billing system must handle:

- Three pricing tiers (Starter, Team, Enterprise) with different feature limits.
- Usage-based charges for LLM token consumption beyond tier allowances.
- Free trial periods.
- Upgrade, downgrade, and cancellation flows.
- Invoice generation and payment history.
- PCI DSS compliance for handling payment information.

Building a custom payment processing system would require PCI DSS Level 1 certification, which is prohibitively expensive and operationally complex for a platform at this stage. We need a solution that minimizes PCI scope while providing full billing functionality.

## Decision

We will use **Stripe** as the payment processor and billing engine, with **Stripe Elements** for client-side payment collection, **Stripe Billing** for subscription management, and **webhook-driven event processing** for lifecycle management.

### PCI Compliance: SAQ-A

By using Stripe Elements (embedded iframes), payment card data never touches our servers. Card numbers, CVVs, and expiration dates are collected directly by Stripe's PCI-certified infrastructure. This qualifies us for **PCI SAQ-A** (Self-Assessment Questionnaire A), the simplest PCI compliance level.

**Data we store in Firestore (non-sensitive tokens only):**

| Field | Example | Sensitive? |
|-------|---------|------------|
| `stripeCustomerId` | `cus_Abc123Def456` | No -- opaque identifier |
| `stripeSubscriptionId` | `sub_Xyz789Ghi012` | No -- opaque identifier |
| `currentPlan` | `starter` | No |
| `trialEndsAt` | `2025-08-01T00:00:00Z` | No |
| `billingEmail` | `admin@example.com` | Low -- already stored as account email |

**Data we never store:**

- Card numbers (PAN)
- CVV / CVC codes
- Full card expiration dates
- Bank account numbers

### Subscription Tiers

| Tier | Price | Included | Overage |
|------|-------|----------|---------|
| **Starter** | $49/month | 5 users, 3 agents, 1,000 runs/mo, 500K tokens/mo | $0.01 per 1K tokens |
| **Team** | $199/month | 25 users, 15 agents, 10,000 runs/mo, 5M tokens/mo | $0.008 per 1K tokens |
| **Enterprise** | Custom | Unlimited users, unlimited agents, custom limits | Negotiated |

Each tier is represented as a Stripe Product with a recurring Price. Overage charges use Stripe's usage-based billing with metered pricing.

### Webhook-Driven Lifecycle

All billing state changes are driven by Stripe webhooks processed by the Billing Service:

| Webhook Event | Action |
|---------------|--------|
| `customer.subscription.created` | Provision tenant, set plan limits in Firestore |
| `customer.subscription.updated` | Update plan limits, handle upgrade/downgrade |
| `customer.subscription.deleted` | Initiate grace period, then deprovision |
| `customer.subscription.trial_will_end` | Send trial-ending notification (3 days before) |
| `invoice.payment_succeeded` | Record payment, reset usage counters |
| `invoice.payment_failed` | Notify tenant admin, initiate retry sequence |
| `customer.subscription.paused` | Suspend agent execution, maintain data |

Webhook signature verification is enforced on every incoming event using `stripe.webhooks.constructEvent()` with the endpoint signing secret.

### Usage-Based Metering via Pub/Sub

Usage events flow through the existing Pub/Sub infrastructure:

1. The LLM Router publishes token usage to `usage.tokens` (see ADR-002).
2. The Orchestrator publishes run completions to `usage.agent-run`.
3. The Billing Service subscribes to both topics and aggregates usage per tenant per billing period.
4. At the end of each billing period (or on-demand), aggregated usage is reported to Stripe via the Usage Records API.

```
LLM Router                    Billing Service           Stripe
    |                              |                      |
    |-- usage.tokens (Pub/Sub) --> |                      |
    |                              |-- aggregate usage -->|
    |                              |                      |
Orchestrator                       |                      |
    |                              |                      |
    |-- usage.agent-run ---------> |                      |
    |                              |-- usage record ----->|
```

### Stripe Customer Portal

For self-service billing management (update payment method, view invoices, cancel subscription), we link tenants to the **Stripe Customer Portal** rather than rebuilding these flows. This further reduces our PCI scope and maintenance burden.

### Free Trials

New tenants receive a 14-day free trial on the Starter or Team plan:

- No credit card is required to start the trial.
- Trial status is tracked via `subscription.trial_end` in Stripe.
- Three days before trial expiration, a webhook triggers an email notification.
- If no payment method is added by trial end, the subscription moves to `incomplete_expired` and agent execution is suspended.

## Consequences

### Positive

- **Minimal PCI scope** -- SAQ-A is the simplest compliance level; no card data ever touches our infrastructure.
- **Proven infrastructure** -- Stripe handles payment processing, retry logic, tax calculation, and invoicing, reducing the surface area we must build and maintain.
- **Usage-based billing** -- Pub/Sub integration enables real-time usage tracking with eventual consistency for billing, matching our existing event-driven architecture.
- **Self-service** -- the Stripe Customer Portal provides a polished payment management experience without custom development.
- **Webhook reliability** -- Stripe's webhook retry mechanism (up to 72 hours) ensures billing events are eventually processed even during Billing Service outages.

### Negative

- **Stripe dependency** -- the billing system is tightly coupled to Stripe; migrating to another provider would require significant rework.
- **Webhook ordering** -- Stripe does not guarantee webhook delivery order; the Billing Service must handle out-of-order events gracefully (idempotency keys, event timestamps).
- **Usage reporting lag** -- aggregating usage via Pub/Sub introduces a delay between actual consumption and Stripe's awareness; overage charges may not appear instantly.
- **Revenue share** -- Stripe charges 2.9% + $0.30 per transaction, which impacts margins on lower-tier subscriptions.
- **Enterprise complexity** -- custom Enterprise pricing requires manual Stripe Product/Price configuration per tenant, which does not scale without tooling.
