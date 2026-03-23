# Nexus Platform Security Architecture

**Version:** 1.0
**Date:** March 2026
**Classification:** Internal

---

## 1. Executive Summary

The Nexus platform is a cloud-native AI orchestration system built on Google Cloud Platform (GCP). It coordinates agent runtimes, skill execution, and LLM routing across distributed environments. Security is foundational to the platform's design, not an afterthought.

This whitepaper describes the security architecture spanning authentication, authorization, transport encryption, data protection, secrets management, supply-chain integrity, runtime isolation, audit logging, prompt injection mitigation, and compliance alignment. Every layer follows the principle of least privilege, defense in depth, and zero-trust networking.

The platform targets SOC 2 Type II alignment, GDPR data residency compliance, and PCI DSS SAQ-A certification for payment processing. All services communicate over encrypted channels, all secrets are managed centrally with automatic rotation, and all agent runtimes operate in sandboxed environments with outbound-only connectivity.

---

## 2. Authentication & Identity

Nexus employs distinct authentication mechanisms for each actor type, ensuring that credentials are scoped appropriately and that no single compromise grants lateral access.

### 2.1 End Users

End-user authentication is handled by **Firebase Authentication** using OpenID Connect (OIDC). Supported identity providers include:

- **Google** -- OAuth 2.0 / OIDC federation
- **Microsoft Entra ID** -- OAuth 2.0 / OIDC federation
- **SAML SSO** -- Enterprise identity provider integration for organizations that require it

Firebase issues short-lived ID tokens (1 hour) and long-lived refresh tokens. ID tokens are validated at the API Gateway on every request using Firebase Admin SDK. Refresh tokens are stored client-side in secure, httpOnly cookies with `SameSite=Strict` and `Secure` flags.

Multi-factor authentication (MFA) is supported and can be enforced at the organization level through Firebase Authentication policies.

### 2.2 Service Accounts

Internal service-to-service authentication uses **GCP Workload Identity**. No static service account keys are created, stored, or distributed. Each Cloud Run service is bound to a dedicated GCP service account with the minimum IAM roles required for its function.

Workload Identity Federation is used for CI/CD pipelines, allowing GitHub Actions and other external systems to authenticate without long-lived credentials.

### 2.3 Agent Runtimes

Agent runtimes authenticate to the Nexus control plane using **mutual TLS (mTLS)** with client certificates. Key properties:

- Certificates are issued by a private Certificate Authority (CA) managed through **GCP Certificate Authority Service (CA Service)**.
- Client certificates have a **24-hour lifetime**, enforcing automatic rotation.
- Certificate renewal is handled transparently by the agent runtime process before expiration.
- The CA pool is dedicated to Nexus and is not shared with other workloads.

### 2.4 CLI Authentication

The Nexus CLI authenticates using the **OAuth 2.0 Device Authorization Grant** (RFC 8628), which is designed for input-constrained devices and CLI tools. The flow proceeds as follows:

1. The CLI requests a device code from the authorization server.
2. The user opens a browser, navigates to the verification URI, and authenticates.
3. The CLI polls for the access token.
4. Tokens are stored in the **OS keyring** (macOS Keychain, Windows Credential Manager, or Linux Secret Service) -- never written to disk in plaintext.

Access tokens are short-lived (1 hour). Refresh tokens are stored in the OS keyring and used to obtain new access tokens transparently.

---

## 3. Authorization (RBAC)

### 3.1 Role Model

Nexus implements a five-tier role-based access control (RBAC) model:

| Role | Description | Typical Use |
|------|-------------|-------------|
| **Viewer** | Read-only access to workspace resources, logs, and metrics | Stakeholders, auditors |
| **Operator** | Viewer permissions plus ability to trigger agent executions and manage runtime configurations | SRE, on-call engineers |
| **Developer** | Operator permissions plus ability to create/modify skills, agent definitions, and deploy to non-production environments | Engineers, data scientists |
| **Admin** | Developer permissions plus user/role management, billing access, and production deployment | Team leads, platform admins |
| **Owner** | Full access including workspace deletion, ownership transfer, and compliance configuration | Organization owners |

### 3.2 Enforcement Points

Authorization is enforced at three layers:

1. **API Gateway** -- Validates the user's role against the requested endpoint and HTTP method. Rejects unauthorized requests before they reach internal services.
2. **Orchestrator** -- Validates that the requesting identity has permission to invoke the specific agent, skill, or workflow. Enforces resource-level permissions (e.g., a developer can only deploy skills they own).
3. **Skill Sandbox** -- Enforces the declared permission manifest for each skill at runtime. A skill cannot access resources beyond what its manifest declares, regardless of the invoking user's role.

Role assignments are stored in Firestore and cached in Redis with a 5-minute TTL. Role changes take effect within 5 minutes without requiring re-authentication.

---

## 4. Transport Security

### 4.1 User to API

All client-facing traffic is served over **HTTPS/2** with **TLS 1.3** exclusively. TLS 1.2 and below are disabled. The API Gateway is fronted by Google Cloud Load Balancing, which terminates TLS using Google-managed certificates with automatic renewal.

HTTP Strict Transport Security (HSTS) headers are set with a 1-year max-age and includeSubDomains directive.

### 4.2 Internal Services

All internal service-to-service communication uses **gRPC with mutual TLS (mTLS)**. Each Cloud Run service presents its Workload Identity-bound certificate, and the receiving service validates it against the expected service account identity.

Plaintext communication between internal services is not permitted. Network policies enforce that only mTLS-encrypted gRPC connections are accepted.

### 4.3 Cloud to Agent Runtimes

Communication between the Nexus control plane and agent runtimes uses **gRPC with mTLS** and **certificate pinning**. The agent runtime pins the server certificate chain to the Nexus CA root, preventing man-in-the-middle attacks even if a trusted public CA is compromised.

Agent runtimes initiate all connections (outbound-only). The control plane never initiates inbound connections to agent runtimes.

---

## 5. Data Protection

### 5.1 Encryption at Rest

All data stored in GCP services is encrypted at rest using **Google-managed encryption keys** (AES-256) by default. This includes:

- Firestore documents and indexes
- Cloud Storage objects
- Memorystore (Redis) snapshots
- Artifact Registry container images
- Cloud Logging log entries

Customer-managed encryption keys (CMEK) can be enabled for organizations with specific regulatory requirements.

### 5.2 Encryption in Transit

All data in transit is encrypted using TLS 1.3. This applies to:

- Client-to-API Gateway connections
- Service-to-service gRPC calls
- Control plane-to-agent runtime connections
- Redis client connections (encryption in transit enabled)
- Firestore client connections

### 5.3 Data Classification Policy

Nexus classifies all data into four tiers:

| Classification | Description | Examples | Controls |
|---------------|-------------|----------|----------|
| **Public** | Non-sensitive, publicly available | Marketing content, public docs | Standard encryption |
| **Internal** | Business data not intended for public disclosure | Usage metrics, feature flags | Encryption + access control |
| **Confidential** | Sensitive business or user data | User prompts, agent outputs, PII | Encryption + RBAC + audit logging |
| **Restricted** | Highly sensitive data subject to regulatory requirements | Auth tokens, encryption keys, payment data | Encryption + RBAC + audit logging + DLP + retention policies |

### 5.4 DLP Scanning

Outbound prompts sent to LLM providers are scanned using **Data Loss Prevention (DLP)** rules before transmission. The DLP pipeline:

1. Scans prompt content for PII patterns (SSN, credit card numbers, email addresses, phone numbers).
2. Scans for secrets patterns (API keys, connection strings, private keys).
3. Redacts or blocks prompts containing restricted data based on organization policy.
4. Logs all DLP events for audit purposes.

### 5.5 Kernel Memory (Short-Term)

Short-term conversational memory is stored in **Redis (Memorystore)** with the following security properties:

- **Encryption in transit** is enabled on all Redis connections.
- **Session-scoped TTL** ensures that conversation context is automatically expired. Default TTL is 24 hours, configurable per workspace.
- Redis is deployed in a private VPC with no public IP address.
- Access is restricted to Cloud Run services via VPC connectors.

### 5.6 Long-Term Memory

Long-term memory is stored in **Firestore** with vector embeddings for semantic retrieval. Security properties include:

- Firestore Security Rules enforce document-level access control.
- Vector embeddings are stored alongside their source documents, inheriting the same access controls.
- Soft-delete with configurable retention periods supports right-to-erasure requests.

---

## 6. Secrets Management

All secrets are stored in **Google Secret Manager**. The platform enforces the following policies:

- **No secrets on disk.** Application code retrieves secrets from Secret Manager at startup or on-demand. Secrets are never written to configuration files, environment variable files, or container images.
- **No static service account keys.** Workload Identity is used for all GCP API authentication.
- **Automatic rotation.** Secrets that support rotation (database passwords, API keys) are rotated automatically on a configurable schedule (default: 90 days). Rotation is handled by Cloud Functions triggered by Pub/Sub notifications.
- **Versioned secrets.** All secrets are versioned. Previous versions are retained for rollback but can be disabled or destroyed per policy.
- **Access logging.** Every secret access is logged in Cloud Audit Logs, including the identity of the accessor and the secret version retrieved.
- **Least-privilege access.** Each service account is granted `secretmanager.secretAccessor` only on the specific secrets it needs, not on the entire project.

---

## 7. Skill Supply-Chain Security

Skills are the extensibility mechanism of the Nexus platform. Because skills execute arbitrary code, supply-chain security is critical.

### 7.1 Artifact Signing

All skill artifacts (container images, WebAssembly modules) are signed using **Cosign** (Sigstore). The signing process:

1. CI/CD builds the skill artifact.
2. The artifact is pushed to Artifact Registry.
3. Cosign signs the artifact using a keyless signing flow (Fulcio + Rekor).
4. The signature and transparency log entry are stored alongside the artifact.
5. At deployment time, the Orchestrator verifies the Cosign signature before allowing execution.

Unsigned or tampered artifacts are rejected.

### 7.2 Dependency Scanning

All skill dependencies are scanned for known vulnerabilities using:

- **Snyk** for continuous monitoring of dependency trees.
- **Dependabot** for automated pull requests when vulnerable dependencies are detected.
- **Container scanning** via Artifact Registry's built-in vulnerability scanning.

Skills with critical or high-severity vulnerabilities are blocked from deployment until remediated.

### 7.3 Manifest-Declared Permissions

Every skill must declare a permission manifest specifying:

- Network endpoints it needs to access (outbound allowlist).
- GCP services it requires (e.g., Cloud Storage, BigQuery).
- Data classifications it will handle.
- Resource limits (CPU, memory, execution timeout).

The manifest is reviewed during skill submission and enforced at the sandbox level during execution. A skill cannot exceed its declared permissions.

### 7.4 Runtime Allow-Listing

Only skills that have been explicitly approved and added to the organization's allow-list can be executed. The allow-list is managed by Admin and Owner roles. Unapproved skills cannot be invoked, even if they exist in the registry.

---

## 8. Agent Runtime Security

Agent runtimes are processes that execute on customer infrastructure (on-premises servers, developer workstations, or cloud VMs). They connect to the Nexus control plane to receive and execute tasks.

### 8.1 Outbound-Only Connections

Agent runtimes initiate all network connections. No inbound ports need to be opened on the host network. The runtime maintains a persistent gRPC stream to the control plane for task assignment.

### 8.2 Skill Allow-List

Each agent runtime is configured with an allow-list of skills it is permitted to execute. This is managed centrally and synchronized on each connection. The runtime rejects any task that references a skill not on its allow-list.

### 8.3 Certificate Pinning

The agent runtime pins the Nexus control plane's TLS certificate chain to the private CA root. This prevents interception even if a public CA is compromised or if the host's trust store is modified.

### 8.4 Sandbox Isolation

Skills execute within isolated sandboxes on the agent runtime:

- **gVisor** provides a user-space kernel that intercepts and filters system calls, preventing skills from directly accessing the host kernel.
- **seccomp** profiles restrict the set of system calls available to skill processes.
- Filesystem access is limited to a temporary, ephemeral directory that is destroyed after execution.
- Network access is restricted to the endpoints declared in the skill's permission manifest.

### 8.5 No Root/Admin Required

The agent runtime process runs as an unprivileged user. It does not require root (Linux/macOS) or Administrator (Windows) privileges. This limits the blast radius if the runtime process is compromised.

### 8.6 Auto-Update with Signed Binaries

The agent runtime automatically updates itself when new versions are available. Updates are verified using:

- **Binary signatures** validated against Nexus's public signing key.
- **Checksum verification** (SHA-256) to ensure integrity.
- **Staged rollouts** to minimize risk from faulty updates.

If signature verification fails, the update is rejected and the runtime continues on the current version. An alert is raised to the platform operations team.

---

## 9. Audit Logging

### 9.1 Logging Scope

The Nexus platform logs all security-relevant events, including:

- Authentication events (login, logout, token refresh, failed attempts).
- Authorization decisions (allowed and denied).
- Resource access (CRUD operations on agents, skills, workspaces).
- Skill executions (invocation, completion, failure).
- Configuration changes (role assignments, policy updates).
- Secret access events.
- DLP events (redactions, blocks).

### 9.2 Storage

Audit logs are written to two destinations:

1. **Firestore** -- Structured audit log documents for platform-level querying and reporting.
2. **Cloud Logging** -- GCP-native logging for integration with Cloud Monitoring, alerting, and export.

### 9.3 Integrity

Audit log integrity is protected using a **hash-chain** mechanism:

- Each log entry includes a SHA-256 hash of the previous entry.
- The chain is anchored to a signed root hash stored in Secret Manager.
- Tampering with any log entry invalidates the hash chain from that point forward.
- Integrity verification runs on a daily schedule and alerts on any chain break.

### 9.4 Retention

| Tier | Duration | Storage |
|------|----------|---------|
| **Hot** | 90 days | Firestore + Cloud Logging |
| **Cold** | 1 year | Cloud Storage (Nearline) |

After the cold retention period, logs are deleted unless a legal hold is in effect. Organizations can configure extended retention periods for compliance requirements.

---

## 10. Prompt Injection Mitigation

Prompt injection is a class of attacks where adversarial input manipulates the behavior of LLM-based systems. Nexus implements multiple defense layers.

### 10.1 Input Guardrails

All user inputs are processed through an input guardrail pipeline before being sent to LLM providers:

- **Length limits** prevent excessively long inputs designed to overflow context windows.
- **Pattern matching** detects common injection patterns (e.g., "ignore previous instructions", encoded payloads).
- **Content policy enforcement** blocks inputs that violate the organization's acceptable use policy.

### 10.2 Content Tagging with Delimiters

The Orchestrator uses structured delimiters to separate system instructions from user content in prompts:

- System instructions are wrapped in authenticated delimiters that are difficult to reproduce in user input.
- User content is explicitly tagged as untrusted.
- Tool outputs are tagged with their source and trust level.

This separation reduces the risk that user content is interpreted as system instructions.

### 10.3 Output Classifiers

LLM outputs are processed through output classifiers before being returned to users or acted upon:

- **Instruction leakage detection** identifies outputs that may contain system prompt content.
- **Tool-call validation** ensures that any tool calls in the output match expected patterns and target allowed endpoints.
- **Content safety scoring** flags outputs that may contain harmful or policy-violating content.

Outputs that fail classification checks are blocked, logged, and escalated for review.

---

## 11. Compliance

### 11.1 SOC 2 Type II Alignment

The Nexus platform is designed to align with SOC 2 Type II requirements across the Trust Services Criteria:

- **Security** -- Access controls, encryption, network segmentation, vulnerability management.
- **Availability** -- Multi-region deployment, auto-scaling, health monitoring, incident response.
- **Processing Integrity** -- Input validation, output verification, audit logging.
- **Confidentiality** -- Data classification, DLP, encryption, access controls.
- **Privacy** -- Data minimization, retention policies, right-to-erasure support.

### 11.2 GDPR Data Residency

For organizations subject to GDPR:

- Data can be configured to reside exclusively in EU regions (europe-west1, europe-west4).
- Cross-region replication can be restricted to EU-only regions.
- Data processing agreements (DPAs) are available.
- Right-to-erasure (Article 17) is supported through the platform's data deletion API.
- Data portability (Article 20) is supported through structured data export.

### 11.3 PCI DSS SAQ-A

Payment processing in Nexus uses **Stripe Elements**, which ensures that cardholder data never touches Nexus servers:

- Payment forms are rendered in Stripe-hosted iframes.
- Card data is transmitted directly from the user's browser to Stripe.
- Nexus stores only Stripe customer IDs and subscription metadata.
- This qualifies the platform for **PCI DSS SAQ-A**, the simplest compliance level.

### 11.4 OWASP Top 10 Mitigations

The platform addresses the OWASP Top 10 (2021) web application security risks:

| OWASP Risk | Mitigation |
|-----------|------------|
| A01: Broken Access Control | RBAC enforced at three layers; principle of least privilege |
| A02: Cryptographic Failures | TLS 1.3 everywhere; AES-256 at rest; no custom cryptography |
| A03: Injection | Parameterized queries; input validation; DLP scanning |
| A04: Insecure Design | Threat modeling during design; security architecture review |
| A05: Security Misconfiguration | Infrastructure as Code; automated compliance scanning |
| A06: Vulnerable Components | Snyk/Dependabot scanning; container image scanning |
| A07: Identity & Authentication Failures | Firebase Auth with MFA; short-lived tokens; no static keys |
| A08: Software & Data Integrity Failures | Cosign artifact signing; hash-chain audit logs |
| A09: Security Logging & Monitoring Failures | Comprehensive audit logging; Cloud Monitoring alerts |
| A10: Server-Side Request Forgery | Network allow-lists; skill permission manifests; sandbox isolation |

---

*This document is maintained by the Nexus Platform Security Team and is reviewed quarterly.*
