/*
  Warnings:

  - A unique constraint covering the columns `[idempotency_key]` on the table `jobs` will be added. If there are existing duplicate values, this will fail.
  - Made the column `auto_sync_enabled` on table `connectors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `excel_mappings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `excel_mappings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `excel_syncs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `excel_syncs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `excel_syncs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `exports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `monte_carlo_sims_limit` on table `org_quotas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `monte_carlo_sims_used` on table `org_quotas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `exports_limit` on table `org_quotas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `exports_used` on table `org_quotas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `alerts_limit` on table `org_quotas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `org_quotas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `org_quotas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `current_month` on table `realtime_simulations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_running` on table `realtime_simulations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `realtime_simulations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `realtime_simulations` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "board_report_schedules" DROP CONSTRAINT IF EXISTS "board_report_schedules_created_by_id_fkey";
ALTER TABLE "board_report_schedules" DROP CONSTRAINT IF EXISTS "board_report_schedules_org_id_fkey";
ALTER TABLE "data_import_batches" DROP CONSTRAINT IF EXISTS "data_import_batches_org_id_fkey";
ALTER TABLE "excel_mappings" DROP CONSTRAINT IF EXISTS "excel_mappings_created_by_fkey";
ALTER TABLE "excel_mappings" DROP CONSTRAINT IF EXISTS "excel_mappings_org_id_fkey";
ALTER TABLE "excel_syncs" DROP CONSTRAINT IF EXISTS "excel_syncs_mapping_id_fkey";
ALTER TABLE "excel_syncs" DROP CONSTRAINT IF EXISTS "excel_syncs_org_id_fkey";
ALTER TABLE "notification_channels" DROP CONSTRAINT IF EXISTS "notification_channels_userId_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_userId_fkey";
ALTER TABLE "org_quotas" DROP CONSTRAINT IF EXISTS "org_quotas_org_id_fkey";
ALTER TABLE "raw_transactions" DROP CONSTRAINT IF EXISTS "raw_transactions_import_batch_id_fkey";
ALTER TABLE "realtime_simulations" DROP CONSTRAINT IF EXISTS "realtime_simulations_org_id_fkey";
ALTER TABLE "realtime_simulations" DROP CONSTRAINT IF EXISTS "realtime_simulations_user_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "idx_provenance_entries_source_ref_gin";
DROP INDEX IF EXISTS "raw_transactions_org_source_id_key";

-- AlterTable
ALTER TABLE "connectors" ALTER COLUMN "auto_sync_enabled" SET NOT NULL,
ALTER COLUMN "last_sync_status" SET DATA TYPE TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "excel_mappings" ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "excel_syncs" ALTER COLUMN "file_name" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "exports" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "org_quotas" ALTER COLUMN "monte_carlo_sims_limit" SET NOT NULL,
ALTER COLUMN "monte_carlo_sims_used" SET NOT NULL,
ALTER COLUMN "exports_limit" SET NOT NULL,
ALTER COLUMN "exports_used" SET NOT NULL,
ALTER COLUMN "alerts_limit" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "realtime_simulations" ALTER COLUMN "current_month" SET NOT NULL,
ALTER COLUMN "is_running" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "drivers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "time_granularity" TEXT NOT NULL DEFAULT 'monthly',
    "unit" TEXT,
    "formula" TEXT,
    "is_calculated" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "driver_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driverId" UUID NOT NULL,
    "scenarioId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "value" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "financial_scenarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "driver_formulas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "expression" TEXT NOT NULL,
    "dependencies" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "computation_traces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "trigger_node_id" TEXT NOT NULL,
    "trigger_user_id" UUID,
    "affected_nodes" JSONB NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "computation_traces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "drivers_orgId_idx" ON "drivers"("orgId");
CREATE INDEX IF NOT EXISTS "drivers_modelId_idx" ON "drivers"("modelId");
CREATE INDEX IF NOT EXISTS "driver_values_driverId_idx" ON "driver_values"("driverId");
CREATE INDEX IF NOT EXISTS "driver_values_scenarioId_idx" ON "driver_values"("scenarioId");
CREATE UNIQUE INDEX IF NOT EXISTS "driver_values_driverId_scenarioId_month_key" ON "driver_values"("driverId", "scenarioId", "month");
CREATE INDEX IF NOT EXISTS "financial_scenarios_orgId_idx" ON "financial_scenarios"("orgId");
CREATE INDEX IF NOT EXISTS "financial_scenarios_modelId_idx" ON "financial_scenarios"("modelId");
CREATE INDEX IF NOT EXISTS "driver_formulas_modelId_idx" ON "driver_formulas"("modelId");
CREATE INDEX IF NOT EXISTS "computation_traces_orgId_idx" ON "computation_traces"("orgId");
CREATE INDEX IF NOT EXISTS "computation_traces_modelId_idx" ON "computation_traces"("modelId");
CREATE INDEX IF NOT EXISTS "connectors_auto_sync_enabled_last_synced_at_idx" ON "connectors"("auto_sync_enabled", "last_synced_at");
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_idempotency_key_key" ON "jobs"("idempotency_key");
CREATE INDEX IF NOT EXISTS "jobs_idempotency_key_idx" ON "jobs"("idempotency_key");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "raw_transactions" ADD CONSTRAINT "raw_transactions_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "data_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_batches" ADD CONSTRAINT "data_import_batches_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_values" ADD CONSTRAINT "driver_values_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_values" ADD CONSTRAINT "driver_values_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "financial_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_scenarios" ADD CONSTRAINT "financial_scenarios_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_scenarios" ADD CONSTRAINT "financial_scenarios_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_formulas" ADD CONSTRAINT "driver_formulas_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_formulas" ADD CONSTRAINT "driver_formulas_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_formulas" ADD CONSTRAINT "driver_formulas_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_report_schedules" ADD CONSTRAINT "board_report_schedules_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_report_schedules" ADD CONSTRAINT "board_report_schedules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computation_traces" ADD CONSTRAINT "computation_traces_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computation_traces" ADD CONSTRAINT "computation_traces_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excel_syncs" ADD CONSTRAINT "excel_syncs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excel_syncs" ADD CONSTRAINT "excel_syncs_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "excel_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excel_mappings" ADD CONSTRAINT "excel_mappings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excel_mappings" ADD CONSTRAINT "excel_mappings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_quotas" ADD CONSTRAINT "org_quotas_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime_simulations" ADD CONSTRAINT "realtime_simulations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime_simulations" ADD CONSTRAINT "realtime_simulations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'board_report_schedules_next_run_idx') THEN
        ALTER INDEX "board_report_schedules_next_run_idx" RENAME TO "board_report_schedules_next_run_at_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'board_report_schedules_org_idx') THEN
        ALTER INDEX "board_report_schedules_org_idx" RENAME TO "board_report_schedules_org_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_data_import_batches_file_hash') THEN
        ALTER INDEX "idx_data_import_batches_file_hash" RENAME TO "data_import_batches_file_hash_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_data_import_batches_org') THEN
        ALTER INDEX "idx_data_import_batches_org" RENAME TO "data_import_batches_org_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_data_import_batches_source_type') THEN
        ALTER INDEX "idx_data_import_batches_source_type" RENAME TO "data_import_batches_source_type_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_excel_mappings_org') THEN
        ALTER INDEX "idx_excel_mappings_org" RENAME TO "excel_mappings_org_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_excel_syncs_file_hash') THEN
        ALTER INDEX "idx_excel_syncs_file_hash" RENAME TO "excel_syncs_file_hash_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_excel_syncs_org') THEN
        ALTER INDEX "idx_excel_syncs_org" RENAME TO "excel_syncs_org_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_excel_syncs_status') THEN
        ALTER INDEX "idx_excel_syncs_status" RENAME TO "excel_syncs_status_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_monte_carlo_jobs_params_hash') THEN
        ALTER INDEX "idx_monte_carlo_jobs_params_hash" RENAME TO "monte_carlo_jobs_params_hash_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notification_channel_unique') THEN
        ALTER INDEX "notification_channel_unique" RENAME TO "notification_channels_orgId_userId_type_key";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_quotas_org') THEN
        ALTER INDEX "idx_org_quotas_org" RENAME TO "org_quotas_org_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_provenance_entries_run_cell') THEN
        ALTER INDEX "idx_provenance_entries_run_cell" RENAME TO "provenance_entries_modelRunId_cell_key_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_raw_transactions_import_batch_id') THEN
        ALTER INDEX "idx_raw_transactions_import_batch_id" RENAME TO "raw_transactions_import_batch_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_raw_transactions_is_duplicate') THEN
        ALTER INDEX "idx_raw_transactions_is_duplicate" RENAME TO "raw_transactions_is_duplicate_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_realtime_simulations_org') THEN
        ALTER INDEX "idx_realtime_simulations_org" RENAME TO "realtime_simulations_org_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_realtime_simulations_snapshot_token') THEN
        ALTER INDEX "idx_realtime_simulations_snapshot_token" RENAME TO "realtime_simulations_snapshot_token_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_realtime_simulations_updated') THEN
        ALTER INDEX "idx_realtime_simulations_updated" RENAME TO "realtime_simulations_updated_at_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_realtime_simulations_user') THEN
        ALTER INDEX "idx_realtime_simulations_user" RENAME TO "realtime_simulations_user_id_idx";
    END IF;
END $$;
