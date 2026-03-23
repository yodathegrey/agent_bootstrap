# Nexus Platform Operator Runbook

## Table of Contents

- [Service Health Checks](#service-health-checks)
- [Common Failure Scenarios](#common-failure-scenarios)
- [Scaling Procedures](#scaling-procedures)
- [Incident Response Template](#incident-response-template)
- [Useful Commands](#useful-commands)

---

## Service Health Checks

Run these commands to verify each service is healthy. Replace `$BASE_URL` with the appropriate environment URL.

```bash
# API Gateway
curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/v1/health

# Orchestrator (internal)
curl -s -o /dev/null -w "%{http_code}" $ORCHESTRATOR_URL/health

# LLM Router (internal)
curl -s -o /dev/null -w "%{http_code}" $LLM_ROUTER_URL/health

# Skill Registry (internal)
curl -s -o /dev/null -w "%{http_code}" $SKILL_REGISTRY_URL/health

# Billing Service (internal)
curl -s -o /dev/null -w "%{http_code}" $BILLING_URL/health

# Redis connectivity
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# Full health with response body
curl -s $BASE_URL/api/v1/health | jq .
```

Quick all-services check:

```bash
for svc in api-gateway orchestrator llm-router skill-registry billing; do
  URL=$(gcloud run services describe $svc --region=$REGION --format='value(status.url)')
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/health")
  echo "$svc: $STATUS"
done
```

---

## Common Failure Scenarios

### 1. API Gateway Not Responding

**Symptoms**: 502/503 errors from the gateway, health check failures.

**Diagnosis**:
```bash
# Check Cloud Run service status
gcloud run services describe api-gateway --region=$REGION

# Check recent logs
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="api-gateway"' \
  --limit=50 --format=json | jq '.[].textPayload'

# Check instance count
gcloud run services describe api-gateway --region=$REGION \
  --format='value(spec.template.spec.containerConcurrency, spec.template.metadata.annotations["autoscaling.knative.dev/maxScale"])'
```

**Resolution**:
1. Check if the service has crashed -- look for OOM or startup errors in logs.
2. Verify environment variables and secrets are correctly set:
   ```bash
   gcloud run services describe api-gateway --region=$REGION --format=yaml | grep -A5 env
   ```
3. Force a new deployment if the revision is stuck:
   ```bash
   gcloud run services update api-gateway --region=$REGION --no-traffic
   gcloud run deploy api-gateway --region=$REGION --image=$IMAGE
   ```
4. Check if upstream services (orchestrator, LLM router) are healthy -- the gateway may be timing out on dependencies.

---

### 2. Orchestrator Session Stuck in RUNNING

**Symptoms**: Session never completes, user sees hanging response, session status remains `RUNNING` indefinitely.

**Diagnosis**:
```bash
# Find stuck sessions in Firestore
gcloud firestore documents list projects/$PROJECT_ID/databases/(default)/documents/sessions \
  --filter="fields.status.stringValue=RUNNING" --limit=10

# Check orchestrator logs for the session
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="orchestrator" AND jsonPayload.sessionId="SESSION_ID"' \
  --limit=20

# Check if the LLM call is still pending
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="llm-router" AND jsonPayload.sessionId="SESSION_ID"' \
  --limit=10
```

**Resolution**:
1. If the LLM provider is responding slowly, the session may resolve on its own. Check LLM Router health.
2. Manually transition the session to an error state:
   ```bash
   curl -X POST $ORCHESTRATOR_URL/api/v1/sessions/SESSION_ID/cancel \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```
3. If sessions are consistently getting stuck, check for:
   - Pub/Sub message acknowledgment issues (messages being redelivered).
   - Redis connection problems preventing state updates.
   - Memory leaks causing the orchestrator to slow down.
4. Restart the orchestrator if the issue is widespread:
   ```bash
   gcloud run services update orchestrator --region=$REGION --no-traffic
   gcloud run deploy orchestrator --region=$REGION --image=$IMAGE
   ```

---

### 3. LLM Router All Adapters Failing

**Symptoms**: All LLM requests returning errors, multiple providers showing failures simultaneously.

**Diagnosis**:
```bash
# Check LLM Router logs for adapter errors
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="llm-router" AND severity>=ERROR' \
  --limit=30

# Check if API keys/secrets are accessible
gcloud secrets list --filter="labels.service=llm-router"
gcloud secrets versions access latest --secret="openai-api-key" > /dev/null && echo "OK" || echo "FAIL"
gcloud secrets versions access latest --secret="anthropic-api-key" > /dev/null && echo "OK" || echo "FAIL"

# Verify external connectivity
gcloud run services describe llm-router --region=$REGION --format='value(spec.template.metadata.annotations["run.googleapis.com/vpc-access-egress"])'
```

**Resolution**:
1. Verify API keys have not expired or been rotated without updating secrets.
2. Check provider status pages (status.openai.com, status.anthropic.com).
3. If a VPC connector is misconfigured, external calls will fail:
   ```bash
   gcloud compute networks vpc-access connectors describe $CONNECTOR --region=$REGION
   ```
4. If one provider is down, verify the fallback logic is working -- the router should failover to alternate providers.
5. Rotate API keys if they are compromised:
   ```bash
   gcloud secrets versions add openai-api-key --data-file=new-key.txt
   gcloud run services update llm-router --region=$REGION --update-secrets=OPENAI_API_KEY=openai-api-key:latest
   ```

---

### 4. Redis Memory Full

**Symptoms**: Alert fires for Redis memory > 90%, write operations failing, increased latency.

**Diagnosis**:
```bash
# Check Redis memory info
gcloud redis instances describe $REDIS_INSTANCE --region=$REGION \
  --format='value(memorySizeGb, host, port)'

# Connect and inspect
redis-cli -h $REDIS_HOST info memory

# Check which keys are consuming the most memory
redis-cli -h $REDIS_HOST --bigkeys

# Check key count by pattern
redis-cli -h $REDIS_HOST dbsize
```

**Resolution**:
1. Flush expired sessions that were not cleaned up:
   ```bash
   redis-cli -h $REDIS_HOST --scan --pattern "session:*" | head -20
   # If sessions have no TTL set, add them:
   redis-cli -h $REDIS_HOST eval "for _,k in ipairs(redis.call('keys','session:*')) do if redis.call('ttl',k)==-1 then redis.call('expire',k,3600) end end" 0
   ```
2. Verify TTL policies are correctly configured in application code.
3. Scale up the Redis instance if growth is legitimate:
   ```bash
   gcloud redis instances update $REDIS_INSTANCE --region=$REGION --size=10
   ```
4. Enable Redis key eviction policy if not already set (allkeys-lru recommended for cache workloads).

---

### 5. Pub/Sub Message Backlog

**Symptoms**: Increasing undelivered message count, delayed session processing, orchestrator not processing events.

**Diagnosis**:
```bash
# Check subscription backlog
gcloud pubsub subscriptions describe orchestrator-events-sub \
  --format='value(ackDeadlineSeconds)'

# Check undelivered messages
gcloud monitoring read "pubsub.googleapis.com/subscription/num_undelivered_messages" \
  --filter='resource.labels.subscription_id="orchestrator-events-sub"'

# Check dead-letter topic
gcloud pubsub subscriptions describe orchestrator-events-sub \
  --format='value(deadLetterPolicy)'
```

**Resolution**:
1. Check if the orchestrator subscriber is running and healthy.
2. If messages are piling up due to processing failures, check error logs:
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="orchestrator" AND severity>=ERROR AND textPayload=~"pubsub"' \
     --limit=20
   ```
3. If messages are stuck due to poison messages, pull and inspect:
   ```bash
   gcloud pubsub subscriptions pull orchestrator-events-sub --limit=5 --auto-ack=false
   ```
4. Scale up the orchestrator to process messages faster:
   ```bash
   gcloud run services update orchestrator --region=$REGION \
     --min-instances=3 --max-instances=20
   ```
5. Purge the subscription if messages are irrecoverably bad (destructive):
   ```bash
   gcloud pubsub subscriptions seek orchestrator-events-sub --time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
   ```

---

### 6. Stripe Webhook Failures

**Symptoms**: Alert for webhook failures, billing not recording usage, customers not being charged.

**Diagnosis**:
```bash
# Check billing service logs
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="billing" AND textPayload=~"stripe|webhook"' \
  --limit=30

# Check the webhook endpoint URL is correct
gcloud run services describe billing --region=$REGION --format='value(status.url)'

# Verify webhook signing secret
gcloud secrets versions access latest --secret="stripe-webhook-secret" > /dev/null && echo "OK" || echo "FAIL"
```

**Resolution**:
1. Verify the webhook endpoint URL in the Stripe Dashboard matches the billing service URL.
2. Check if the webhook signing secret has been rotated in Stripe but not updated in GCP Secrets:
   ```bash
   gcloud secrets versions add stripe-webhook-secret --data-file=new-secret.txt
   gcloud run services update billing --region=$REGION \
     --update-secrets=STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest
   ```
3. Check Stripe Dashboard > Developers > Webhooks for failed delivery attempts and error details.
4. If the billing service is down, failed webhooks will be retried by Stripe for up to 72 hours. Fix the service and events will replay.
5. For missed events, use the Stripe CLI to resend:
   ```bash
   stripe events resend evt_xxxxx
   ```

---

### 7. Agent Runtime Disconnected

**Symptoms**: Agent sessions fail to execute skills, skill invocations time out, "runtime not available" errors.

**Diagnosis**:
```bash
# Check skill registry for registered runtimes
curl -s $SKILL_REGISTRY_URL/api/v1/runtimes | jq .

# Check orchestrator logs for runtime connection errors
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="orchestrator" AND textPayload=~"runtime|disconnect|timeout"' \
  --limit=20

# Check Cloud Run service status for all services
for svc in api-gateway orchestrator llm-router skill-registry billing; do
  STATUS=$(gcloud run services describe $svc --region=$REGION --format='value(status.conditions[0].status)')
  echo "$svc: $STATUS"
done
```

**Resolution**:
1. Verify the agent runtime container is running and has not crashed:
   ```bash
   gcloud run services describe skill-registry --region=$REGION
   ```
2. Check network connectivity between the orchestrator and the runtime. Ensure the VPC connector allows internal traffic.
3. Restart the runtime service:
   ```bash
   gcloud run deploy skill-registry --region=$REGION --image=$IMAGE
   ```
4. If the runtime is a custom external service, verify its connection URL and authentication credentials are correct.
5. Check if the runtime has been deregistered -- re-register if needed:
   ```bash
   curl -X POST $SKILL_REGISTRY_URL/api/v1/runtimes \
     -H "Content-Type: application/json" \
     -d '{"name": "default", "url": "RUNTIME_URL", "healthEndpoint": "/health"}'
   ```

---

## Scaling Procedures

### Scale Up Cloud Run Services

```bash
# Increase max instances for a specific service
gcloud run services update $SERVICE --region=$REGION \
  --max-instances=50

# Increase minimum instances (warm start, costs more)
gcloud run services update $SERVICE --region=$REGION \
  --min-instances=5

# Increase CPU/memory for a service
gcloud run services update $SERVICE --region=$REGION \
  --cpu=2 --memory=2Gi
```

### Scale Up Redis

```bash
# Check current tier
gcloud redis instances describe $REDIS_INSTANCE --region=$REGION

# Scale memory
gcloud redis instances update $REDIS_INSTANCE --region=$REGION --size=10

# Upgrade tier (requires maintenance window)
gcloud redis instances update $REDIS_INSTANCE --region=$REGION --tier=STANDARD_HA
```

### Scale Pub/Sub Throughput

Pub/Sub scales automatically. If you hit quota limits:

```bash
# Check current quotas
gcloud pubsub topics describe orchestrator-events --format=json

# Request quota increase via console or:
gcloud alpha services quota update pubsub.googleapis.com --consumer=projects/$PROJECT_ID
```

### Emergency Scale-Down

```bash
# Reduce instances to save costs during an incident
gcloud run services update $SERVICE --region=$REGION \
  --max-instances=5 --min-instances=0
```

---

## Incident Response Template

Copy and fill out when an incident occurs:

```
## Incident Report

**Date**: YYYY-MM-DD
**Severity**: P1 / P2 / P3 / P4
**Duration**: HH:MM - HH:MM (X minutes)
**Affected Services**: [list services]
**Impact**: [user-facing impact description]

### Timeline
- HH:MM - Alert triggered: [description]
- HH:MM - On-call acknowledged
- HH:MM - Root cause identified: [description]
- HH:MM - Mitigation applied: [description]
- HH:MM - Service restored
- HH:MM - Incident resolved

### Root Cause
[Detailed technical explanation of what went wrong]

### Resolution
[What was done to fix the immediate issue]

### Action Items
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
- [ ] [Monitoring improvement]

### Lessons Learned
[What we learned and how we can prevent this in the future]
```

---

## Useful Commands

### gcloud

```bash
# List all Cloud Run services and their URLs
gcloud run services list --region=$REGION --format='table(metadata.name, status.url, status.conditions[0].status)'

# Tail logs for a specific service
gcloud logging tail 'resource.type="cloud_run_revision" AND resource.labels.service_name="SERVICE_NAME"'

# View recent error logs across all services
gcloud logging read 'resource.type="cloud_run_revision" AND severity>=ERROR' --limit=50 --format=json | jq '.[].textPayload'

# Get current revision traffic split
gcloud run services describe $SERVICE --region=$REGION --format='value(status.traffic)'

# Roll back to previous revision
gcloud run services update-traffic $SERVICE --region=$REGION --to-revisions=REVISION_NAME=100

# Check secrets
gcloud secrets list --format='table(name, createTime)'

# View Firestore document
gcloud firestore documents get projects/$PROJECT_ID/databases/(default)/documents/COLLECTION/DOC_ID
```

### Redis

```bash
# Connect to Redis
redis-cli -h $REDIS_HOST -p $REDIS_PORT

# Common inspection commands
redis-cli -h $REDIS_HOST info keyspace
redis-cli -h $REDIS_HOST info memory
redis-cli -h $REDIS_HOST info clients
redis-cli -h $REDIS_HOST --bigkeys
redis-cli -h $REDIS_HOST slowlog get 10
redis-cli -h $REDIS_HOST monitor  # WARNING: impacts performance in production
```

### Terraform

```bash
# Plan changes
cd infra && terraform plan -var-file=environments/$ENV.tfvars

# Apply changes
cd infra && terraform apply -var-file=environments/$ENV.tfvars

# View current state for a resource
terraform state show module.monitoring.google_monitoring_alert_policy.api_gateway_5xx

# Import existing resource
terraform import module.monitoring.google_monitoring_dashboard.nexus_overview projects/$PROJECT_ID/dashboards/DASHBOARD_ID

# Destroy a specific resource (use with caution)
terraform destroy -target=module.monitoring.google_monitoring_alert_policy.api_gateway_5xx
```

### Pub/Sub

```bash
# List topics
gcloud pubsub topics list

# List subscriptions
gcloud pubsub subscriptions list

# Pull messages for debugging (without ack)
gcloud pubsub subscriptions pull $SUBSCRIPTION --limit=5 --auto-ack=false

# Publish a test message
gcloud pubsub topics publish $TOPIC --message='{"test": true}'

# Check dead-letter queue
gcloud pubsub subscriptions pull $DLQ_SUBSCRIPTION --limit=10
```

### Load Testing

```bash
# Run k6 tests (requires k6 installed: brew install k6)
cd tests/load

# Quick health check
k6 run health.js -e BASE_URL=https://your-api.run.app

# Agent CRUD test
k6 run agents.js -e BASE_URL=https://your-api.run.app -e API_KEY=your-key

# Session load test
k6 run sessions.js -e BASE_URL=https://your-api.run.app -e API_KEY=your-key -e AGENT_ID=your-agent-id

# Full combined load test
k6 run full-load.js -e BASE_URL=https://your-api.run.app -e API_KEY=your-key -e AGENT_ID=your-agent-id

# Run with fewer VUs for a smoke test
k6 run full-load.js --vus 5 --duration 30s -e BASE_URL=https://your-api.run.app
```
