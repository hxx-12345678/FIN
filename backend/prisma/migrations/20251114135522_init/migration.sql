-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orgs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "plan_tier" TEXT NOT NULL DEFAULT 'free',
    "data_region" TEXT NOT NULL DEFAULT 'global',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_org_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_org_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connectors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "config_json" JSONB,
    "encrypted_config" BYTEA,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "connectorId" UUID,
    "source_id" TEXT,
    "date" DATE NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "category" TEXT,
    "description" TEXT,
    "raw_payload" JSONB,
    "imported_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "mapped_to_model_item" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "model_json" JSONB NOT NULL,
    "createdById" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "modelId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "run_type" TEXT NOT NULL,
    "params_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "result_s3" TEXT,
    "summary_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "model_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monte_carlo_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "modelRunId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "num_simulations" INTEGER NOT NULL DEFAULT 2000,
    "params_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "result_s3" TEXT,
    "percentiles_json" JSONB,
    "cpu_seconds_estimate" DECIMAL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "monte_carlo_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID,
    "userId" UUID,
    "prompt_template" TEXT,
    "rendered_prompt" TEXT,
    "response_text" TEXT,
    "provider" TEXT,
    "model_used" TEXT,
    "tokens_used" INTEGER,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provenance_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "modelRunId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "cell_key" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_ref" JSONB,
    "promptId" UUID,
    "confidence_score" DECIMAL(5,4),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provenance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "modelRunId" UUID,
    "orgId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "s3_key" TEXT,
    "createdById" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_type" TEXT,
    "orgId" UUID,
    "object_id" UUID,
    "status" TEXT DEFAULT 'queued',
    "progress" DECIMAL DEFAULT 0,
    "logs" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorUserId" UUID,
    "orgId" UUID,
    "action" TEXT NOT NULL,
    "object_type" TEXT,
    "object_id" UUID,
    "meta_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "scope" TEXT NOT NULL DEFAULT 'read-only',
    "createdById" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID,
    "metric" TEXT NOT NULL,
    "value" DECIMAL,
    "bucket_time" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_org_roles_orgId_idx" ON "user_org_roles"("orgId");

-- CreateIndex
CREATE INDEX "user_org_roles_userId_idx" ON "user_org_roles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_org_roles_userId_orgId_key" ON "user_org_roles"("userId", "orgId");

-- CreateIndex
CREATE INDEX "connectors_orgId_idx" ON "connectors"("orgId");

-- CreateIndex
CREATE INDEX "connectors_type_idx" ON "connectors"("type");

-- CreateIndex
CREATE INDEX "raw_transactions_orgId_idx" ON "raw_transactions"("orgId");

-- CreateIndex
CREATE INDEX "raw_transactions_source_id_idx" ON "raw_transactions"("source_id");

-- CreateIndex
CREATE INDEX "raw_transactions_date_idx" ON "raw_transactions"("date");

-- CreateIndex
CREATE INDEX "raw_transactions_org_date_idx" ON "raw_transactions"("orgId", "date");

-- CreateIndex
CREATE INDEX "chart_of_accounts_orgId_idx" ON "chart_of_accounts"("orgId");

-- CreateIndex
CREATE INDEX "chart_of_accounts_mapped_to_model_item_idx" ON "chart_of_accounts"("mapped_to_model_item");

-- CreateIndex
CREATE INDEX "models_orgId_idx" ON "models"("orgId");

-- CreateIndex
CREATE INDEX "model_runs_orgId_idx" ON "model_runs"("orgId");

-- CreateIndex
CREATE INDEX "model_runs_modelId_idx" ON "model_runs"("modelId");

-- CreateIndex
CREATE INDEX "model_runs_status_idx" ON "model_runs"("status");

-- CreateIndex
CREATE INDEX "monte_carlo_jobs_orgId_idx" ON "monte_carlo_jobs"("orgId");

-- CreateIndex
CREATE INDEX "monte_carlo_jobs_modelRunId_idx" ON "monte_carlo_jobs"("modelRunId");

-- CreateIndex
CREATE INDEX "monte_carlo_jobs_status_idx" ON "monte_carlo_jobs"("status");

-- CreateIndex
CREATE INDEX "prompts_orgId_idx" ON "prompts"("orgId");

-- CreateIndex
CREATE INDEX "prompts_created_at_idx" ON "prompts"("created_at");

-- CreateIndex
CREATE INDEX "provenance_entries_modelRunId_idx" ON "provenance_entries"("modelRunId");

-- CreateIndex
CREATE INDEX "provenance_entries_cell_key_idx" ON "provenance_entries"("cell_key");

-- CreateIndex
CREATE INDEX "exports_orgId_idx" ON "exports"("orgId");

-- CreateIndex
CREATE INDEX "jobs_orgId_idx" ON "jobs"("orgId");

-- CreateIndex
CREATE INDEX "jobs_job_type_idx" ON "jobs"("job_type");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "share_tokens_token_key" ON "share_tokens"("token");

-- CreateIndex
CREATE INDEX "share_tokens_orgId_idx" ON "share_tokens"("orgId");

-- CreateIndex
CREATE INDEX "share_tokens_token_idx" ON "share_tokens"("token");

-- CreateIndex
CREATE INDEX "billing_usage_orgId_metric_bucket_time_idx" ON "billing_usage"("orgId", "metric", "bucket_time");

-- AddForeignKey
ALTER TABLE "user_org_roles" ADD CONSTRAINT "user_org_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_org_roles" ADD CONSTRAINT "user_org_roles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_transactions" ADD CONSTRAINT "raw_transactions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_transactions" ADD CONSTRAINT "raw_transactions_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_runs" ADD CONSTRAINT "model_runs_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_runs" ADD CONSTRAINT "model_runs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monte_carlo_jobs" ADD CONSTRAINT "monte_carlo_jobs_modelRunId_fkey" FOREIGN KEY ("modelRunId") REFERENCES "model_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monte_carlo_jobs" ADD CONSTRAINT "monte_carlo_jobs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_entries" ADD CONSTRAINT "provenance_entries_modelRunId_fkey" FOREIGN KEY ("modelRunId") REFERENCES "model_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_entries" ADD CONSTRAINT "provenance_entries_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_entries" ADD CONSTRAINT "provenance_entries_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_modelRunId_fkey" FOREIGN KEY ("modelRunId") REFERENCES "model_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_tokens" ADD CONSTRAINT "share_tokens_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_tokens" ADD CONSTRAINT "share_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_usage" ADD CONSTRAINT "billing_usage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
