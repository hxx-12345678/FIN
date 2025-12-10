# Deployment Checklist

## Environment Variables

Ensure these are set in your production environment (.env or platform secrets):

### Core
- `NODE_ENV`: "production"
- `PORT`: 8000
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=10`)
- `JWT_SECRET`: Strong secret for token signing
- `CORS_ORIGIN`: Frontend URL (e.g., `https://app.finapilot.com`)

### Services
- `REDIS_URL`: Redis connection string (e.g., `redis://:pass@host:6379`) for job queue
- `S3_BUCKET_NAME`: Name of S3 bucket for artifacts
- `AWS_ACCESS_KEY_ID`: AWS Access Key
- `AWS_SECRET_ACCESS_KEY`: AWS Secret Key
- `AWS_REGION`: AWS Region (e.g., `us-east-1`)

### AI & LLM
- `OPENAI_API_KEY`: For GPT-4 fallback
- `ANTHROPIC_API_KEY`: For Claude 3.5 (primary)

### Observability
- `SENTRY_DSN`: Sentry DSN for error tracking
- `PROMETHEUS_PORT`: Port for metrics (default 9090)

### Worker
- `WORKER_CONCURRENCY`: Number of worker processes (default 2)
- `PYTHONPATH`: `.`

## Infrastructure

- [ ] **Database**: PostgreSQL 15+ with `pgvector` extension (optional for future embeddings).
- [ ] **Queue**: Redis 6+ (managed or self-hosted).
- [ ] **Storage**: S3-compatible object storage (MinIO for dev, S3/R2 for prod).
- [ ] **Worker**: Python 3.11+ environment with dependencies listed in `python-worker/requirements.txt`.

## Deployment Steps

1.  **Build Backend**:
    ```bash
    cd backend
    npm install
    npm run build
    npx prisma migrate deploy
    ```

2.  **Start Backend**:
    ```bash
    npm start
    ```

3.  **Start Worker**:
    ```bash
    cd python-worker
    pip install -r requirements.txt
    python worker.py
    ```

4.  **Build Frontend**:
    ```bash
    cd client
    npm install
    npm run build
    npm start
    ```

## Verification

- [ ] Check `/api/v1/health` endpoint.
- [ ] Verify database connection and migrations.
- [ ] Verify Redis connection in logs.
- [ ] Test S3 upload/download (using Excel import or Export feature).
- [ ] Verify Sentry is receiving events.



SOC2-ready policy templates

Access Control Policy

Change Management

Logging & Monitoring

Incident Response

Vendor Risk

Encryption Standards

Data Classification

Password/SSO policy

Secure Development Lifecycle

(Written to SOC2 TSC framework language so auditors accept it.)

🇪🇺 GDPR DPA Template

Includes:

Data processing roles

Sub-processor terms

Data subject rights

International transfer clauses

Audit rights

Data retention/deletion

Security measures

(Fully template for signing with clients.)

📦 Data Retention Policy

Financial data retention rules

Deletion timelines

Customer requested deletion

Audit logs retention

Secure disposal

Backups lifecycle

🤖 AI Compliance Policy

AI usage statements

Explainability requirements

Deterministic fallback

Safety controls

Human-in-the-loop

Hallucination-filter

Risk classification

(directly referencing your AI approach)

📊 Monte-Carlo Statistical Validation Checklist

sampling correctness

distribution assumptions

percentile correctness

seed reproducibility

confidence intervals

run variance test

validation dataset

performance test per 10k iterations

☁ Secure Infrastructure Terraform Templates

AWS secure VPC

private subnets

Postgres encryption

Secrets Manager

autoscaling workers

IAM least privilege

S3 encryption + lifecycle

CloudWatch logging

🧩 Full Multi-Tenant RBAC System

tenant isolation model

org/user roles

ABAC rules

audit events

privilege escalation protection

SSO (Google, Okta)

secure admin APIs

🧪 Unit tests & Integration Tests

Monte-Carlo test harness

numeric determinism tests

data lineage tests

RBAC tests

API contract tests

load tests

🏗 Production-ready Next.js/Postgres Architecture

API gateway

auth service

worker service

simulation service

event bus

Prisma schema

migrations

Docker

CI/CD

(deployable)

💯 BUT—Is anything missing? Yes. Here’s what is still left to make your “mansion” unstoppable:
1. Data Processing Agreements with region-specific language

India

USA

Canada

UK
(you need small legal variations)

2. Information Security Management System (ISMS) binder

For SOC2:

Policies

SOPs

Evidence checklist

Control matrix

auditor artifacts

I can create your entire SOC2 Evidence Binder to hand to auditors.

3. Continuous Compliance Automation

logs

evidence tracking

changes

approvals
(so SOC2 audit becomes easy yearly)

4. Business Continuity / Disaster Recovery

required for enterprise deals

5. Vendor Risk Management

Enterprises ask this every time.

6. Data Localization Plan

US
Canada
EU/UK
India

(Critical for enterprises)

7. Zero Trust & Secure-by-default

mandatory for enterprise buyers

8. Penetration Testing Policy

Many companies require it for vendor approval.