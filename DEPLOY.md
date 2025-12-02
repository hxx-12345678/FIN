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

