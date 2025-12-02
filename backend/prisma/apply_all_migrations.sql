-- Consolidated migration script to apply all pending migrations
-- This script is idempotent and can be run multiple times safely
-- Run with: psql $DATABASE_URL -f apply_all_migrations.sql

BEGIN;

-- ============================================================================
-- Migration: 20251126000000_add_connector_sync_fields
-- ============================================================================
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS "sync_frequency_hours" INTEGER DEFAULT 24;
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS "auto_sync_enabled" BOOLEAN DEFAULT true;
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS "last_sync_status" VARCHAR(50);
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS "last_sync_error" TEXT;

-- ============================================================================
-- Migration: 20251126000001_add_export_status
-- ============================================================================
ALTER TABLE "exports" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'queued';
UPDATE "exports" SET "status" = 'completed' WHERE "status" IS NULL AND "file_data" IS NOT NULL;
UPDATE "exports" SET "status" = 'queued' WHERE "status" IS NULL;

-- ============================================================================
-- Migration: 20251126120000_add_budgets_table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "budgets_org_id_category_month_key" ON "budgets"("org_id", "category", "month");
CREATE INDEX IF NOT EXISTS "budgets_org_id_idx" ON "budgets"("org_id");
CREATE INDEX IF NOT EXISTS "budgets_org_id_month_idx" ON "budgets"("org_id", "month");
CREATE INDEX IF NOT EXISTS "budgets_category_idx" ON "budgets"("category");

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'budgets_org_id_fkey'
    ) THEN
        ALTER TABLE "budgets" ADD CONSTRAINT "budgets_org_id_fkey" 
            FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'budgets_created_by_id_fkey'
    ) THEN
        ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_id_fkey" 
            FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- Migration: 20251127000000_add_connector_updated_at
-- ============================================================================
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS "update_connectors_updated_at" ON "connectors";
CREATE TRIGGER "update_connectors_updated_at"
    BEFORE UPDATE ON "connectors"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration: 20251129_add_excel_sync_mappings_quotas
-- ============================================================================

-- Create excel_mappings table
CREATE TABLE IF NOT EXISTS "excel_mappings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "mapping_json" JSONB NOT NULL,
  "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ(6) DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_excel_mappings_org" ON "excel_mappings"("org_id");

-- Create excel_syncs table
CREATE TABLE IF NOT EXISTS "excel_syncs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "file_name" VARCHAR(255),
  "file_hash" VARCHAR(64),
  "mapping_id" UUID REFERENCES "excel_mappings"("id") ON DELETE SET NULL,
  "status" VARCHAR(50) DEFAULT 'pending',
  "last_synced_at" TIMESTAMPTZ(6),
  "error_message" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_excel_syncs_org" ON "excel_syncs"("org_id");
CREATE INDEX IF NOT EXISTS "idx_excel_syncs_status" ON "excel_syncs"("status");
CREATE INDEX IF NOT EXISTS "idx_excel_syncs_file_hash" ON "excel_syncs"("file_hash");

-- Create org_quotas table
CREATE TABLE IF NOT EXISTS "org_quotas" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL UNIQUE REFERENCES "orgs"("id") ON DELETE CASCADE,
  "monte_carlo_sims_limit" INTEGER DEFAULT 10000,
  "monte_carlo_sims_used" INTEGER DEFAULT 0,
  "monte_carlo_reset_at" TIMESTAMPTZ(6),
  "exports_limit" INTEGER DEFAULT 100,
  "exports_used" INTEGER DEFAULT 0,
  "exports_reset_at" TIMESTAMPTZ(6),
  "alerts_limit" INTEGER DEFAULT 10,
  "created_at" TIMESTAMPTZ(6) DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_org_quotas_org" ON "org_quotas"("org_id");

-- Add new columns to exports table
ALTER TABLE "exports" 
  ADD COLUMN IF NOT EXISTS "provenance_appendix" JSONB;

-- Add new columns to monte_carlo_jobs table
ALTER TABLE "monte_carlo_jobs"
  ADD COLUMN IF NOT EXISTS "sensitivity_json" JSONB,
  ADD COLUMN IF NOT EXISTS "confidence_level" DECIMAL(5, 4),
  ADD COLUMN IF NOT EXISTS "cpu_seconds_actual" DECIMAL;

CREATE INDEX IF NOT EXISTS "idx_monte_carlo_jobs_params_hash" ON "monte_carlo_jobs"("params_hash");

-- Add composite index on provenance_entries for better query performance
CREATE INDEX IF NOT EXISTS "idx_provenance_entries_run_cell" ON "provenance_entries"("model_run_id", "cell_key");

-- Create GIN index on provenance_entries.source_ref for JSONB queries
CREATE INDEX IF NOT EXISTS "idx_provenance_entries_source_ref_gin" ON "provenance_entries" USING GIN ("source_ref");

-- Populate org_quotas for existing orgs
INSERT INTO "org_quotas" ("org_id", "monte_carlo_sims_limit", "exports_limit", "alerts_limit", "monte_carlo_reset_at", "exports_reset_at")
SELECT 
  "id",
  CASE 
    WHEN "plan_tier" = 'enterprise' THEN 100000
    WHEN "plan_tier" = 'pro' THEN 10000
    ELSE 5000
  END as monte_carlo_sims_limit,
  CASE
    WHEN "plan_tier" = 'enterprise' THEN 1000
    WHEN "plan_tier" = 'pro' THEN 100
    ELSE 20
  END as exports_limit,
  CASE
    WHEN "plan_tier" = 'enterprise' THEN 50
    WHEN "plan_tier" = 'pro' THEN 20
    ELSE 10
  END as alerts_limit,
  DATE_TRUNC('month', NOW() + INTERVAL '1 month') as monte_carlo_reset_at,
  DATE_TRUNC('month', NOW() + INTERVAL '1 month') as exports_reset_at
FROM "orgs"
WHERE NOT EXISTS (
  SELECT 1 FROM "org_quotas" WHERE "org_quotas"."org_id" = "orgs"."id"
)
ON CONFLICT ("org_id") DO NOTHING;

COMMIT;

-- Add comments
COMMENT ON TABLE "excel_syncs" IS 'Tracks Excel file sync operations';
COMMENT ON TABLE "excel_mappings" IS 'Stores column mapping templates for Excel imports';
COMMENT ON TABLE "org_quotas" IS 'Per-organization compute and export quotas';
COMMENT ON COLUMN "exports"."provenance_appendix" IS 'Provenance data embedded in export for audit trail';
COMMENT ON COLUMN "monte_carlo_jobs"."sensitivity_json" IS 'Tornado chart and variance decomposition data';


