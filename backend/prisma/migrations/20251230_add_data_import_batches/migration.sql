-- Data Import Batches + transaction lineage/dedup primitives
-- Date: 2025-12-30

-- 1) Import batches table (lineage root)
CREATE TABLE IF NOT EXISTS "data_import_batches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "source_type" TEXT NOT NULL,         -- csv|xlsx|connector
  "source_ref" TEXT,                   -- uploadKey|fileHash|connectorId
  "file_hash" TEXT,
  "mapping_json" JSONB,
  "stats_json" JSONB,
  "status" TEXT NOT NULL DEFAULT 'created',
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_data_import_batches_org" ON "data_import_batches" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_data_import_batches_source_type" ON "data_import_batches" ("source_type");
CREATE INDEX IF NOT EXISTS "idx_data_import_batches_file_hash" ON "data_import_batches" ("file_hash");

-- 2) Add lineage + dedupe flags to raw_transactions
ALTER TABLE IF EXISTS "raw_transactions"
  ADD COLUMN IF NOT EXISTS "import_batch_id" UUID REFERENCES "data_import_batches"("id") ON DELETE SET NULL;

ALTER TABLE IF EXISTS "raw_transactions"
  ADD COLUMN IF NOT EXISTS "is_duplicate" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_raw_transactions_import_batch_id" ON "raw_transactions" ("import_batch_id");
CREATE INDEX IF NOT EXISTS "idx_raw_transactions_is_duplicate" ON "raw_transactions" ("is_duplicate");

-- 3) Idempotency: ensure (orgId, source_id) is unique when source_id is provided
-- Postgres UNIQUE allows multiple NULLs, so legacy rows with NULL source_id are fine.
CREATE UNIQUE INDEX IF NOT EXISTS "raw_transactions_org_source_id_key"
  ON "raw_transactions" ("orgId", "source_id");



