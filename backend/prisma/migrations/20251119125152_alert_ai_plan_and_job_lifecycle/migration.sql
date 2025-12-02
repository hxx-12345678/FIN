-- DropIndex (only if exists)
DROP INDEX IF EXISTS "provenance_entries_source_ref_idx";

-- CreateIndex (only if not exists - idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_idempotency_key_key" ON "jobs"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;

-- CreateIndex (only if not exists - idempotent)
CREATE INDEX IF NOT EXISTS "jobs_idempotency_key_idx" ON "jobs"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;

-- CreateIndex (only if not exists - idempotent)
CREATE INDEX IF NOT EXISTS "model_runs_run_type_idx" ON "model_runs"("run_type");
