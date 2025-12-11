-- Safe migration script with IF NOT EXISTS and IF EXISTS checks
-- Drop index only if it exists
DROP INDEX IF EXISTS "idx_provenance_entries_source_ref_gin";

-- Alter connectors table
ALTER TABLE "connectors" 
  ALTER COLUMN "auto_sync_enabled" SET NOT NULL,
  ALTER COLUMN "last_sync_status" SET DATA TYPE TEXT,
  ALTER COLUMN "updated_at" DROP DEFAULT;

-- Alter excel_mappings table  
ALTER TABLE "excel_mappings" 
  ALTER COLUMN "name" SET DATA TYPE TEXT,
  ALTER COLUMN "created_at" SET NOT NULL,
  ALTER COLUMN "updated_at" SET NOT NULL;

-- Alter excel_syncs table
ALTER TABLE "excel_syncs" 
  ALTER COLUMN "file_name" SET DATA TYPE TEXT,
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DATA TYPE TEXT,
  ALTER COLUMN "created_at" SET NOT NULL,
  ALTER COLUMN "updated_at" SET NOT NULL;

-- Add approval workflow columns to exports (with IF NOT EXISTS check)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='approval_required') THEN
    ALTER TABLE "exports" ADD COLUMN "approval_required" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='approval_status') THEN
    ALTER TABLE "exports" ADD COLUMN "approval_status" TEXT DEFAULT 'draft';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='approved_at') THEN
    ALTER TABLE "exports" ADD COLUMN "approved_at" TIMESTAMPTZ(6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='approved_by') THEN
    ALTER TABLE "exports" ADD COLUMN "approved_by" UUID[] DEFAULT ARRAY[]::UUID[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='approver_ids') THEN
    ALTER TABLE "exports" ADD COLUMN "approver_ids" UUID[] DEFAULT ARRAY[]::UUID[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='distribution_list') THEN
    ALTER TABLE "exports" ADD COLUMN "distribution_list" TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='distribution_method') THEN
    ALTER TABLE "exports" ADD COLUMN "distribution_method" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='parent_export_id') THEN
    ALTER TABLE "exports" ADD COLUMN "parent_export_id" UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='published_at') THEN
    ALTER TABLE "exports" ADD COLUMN "published_at" TIMESTAMPTZ(6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='rejected_at') THEN
    ALTER TABLE "exports" ADD COLUMN "rejected_at" TIMESTAMPTZ(6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='rejected_by') THEN
    ALTER TABLE "exports" ADD COLUMN "rejected_by" UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='rejection_reason') THEN
    ALTER TABLE "exports" ADD COLUMN "rejection_reason" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='schedule_frequency') THEN
    ALTER TABLE "exports" ADD COLUMN "schedule_frequency" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='scheduled_at') THEN
    ALTER TABLE "exports" ADD COLUMN "scheduled_at" TIMESTAMPTZ(6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exports' AND column_name='version') THEN
    ALTER TABLE "exports" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

ALTER TABLE "exports" 
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DATA TYPE TEXT,
  ALTER COLUMN "updated_at" DROP DEFAULT;

-- Alter org_quotas table
ALTER TABLE "org_quotas" 
  ALTER COLUMN "monte_carlo_sims_limit" SET NOT NULL,
  ALTER COLUMN "monte_carlo_sims_used" SET NOT NULL,
  ALTER COLUMN "exports_limit" SET NOT NULL,
  ALTER COLUMN "exports_used" SET NOT NULL,
  ALTER COLUMN "alerts_limit" SET NOT NULL,
  ALTER COLUMN "created_at" SET NOT NULL,
  ALTER COLUMN "updated_at" SET NOT NULL;

-- Add columns to org_settings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='org_settings' AND column_name='compliance_json') THEN
    ALTER TABLE "org_settings" ADD COLUMN "compliance_json" JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='org_settings' AND column_name='meta_json') THEN
    ALTER TABLE "org_settings" ADD COLUMN "meta_json" JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='org_settings' AND column_name='policies_json') THEN
    ALTER TABLE "org_settings" ADD COLUMN "policies_json" JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='org_settings' AND column_name='security_controls_json') THEN
    ALTER TABLE "org_settings" ADD COLUMN "security_controls_json" JSONB;
  END IF;
END $$;

-- Alter realtime_simulations table
ALTER TABLE "realtime_simulations" 
  ALTER COLUMN "current_month" SET NOT NULL,
  ALTER COLUMN "is_running" SET NOT NULL,
  ALTER COLUMN "created_at" SET NOT NULL,
  ALTER COLUMN "updated_at" SET NOT NULL;

-- Create missing tables
CREATE TABLE IF NOT EXISTS "report_approval_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exportId" UUID NOT NULL,
    "approverId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_approval_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "userId" UUID,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_channels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "userId" UUID,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "appearanceJson" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "org_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "industry" TEXT,
    "companySize" TEXT,
    "website" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "org_details_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "localization_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "displayCurrency" TEXT NOT NULL DEFAULT 'USD',
    "language" TEXT NOT NULL DEFAULT 'en',
    "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "numberFormat" TEXT NOT NULL DEFAULT '1,234.56',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "autoFxUpdate" BOOLEAN NOT NULL DEFAULT true,
    "fxRatesJson" JSONB,
    "gstEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tdsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "einvoicingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "complianceJson" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "localization_settings_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "report_approval_history_exportId_idx" ON "report_approval_history"("exportId");
CREATE INDEX IF NOT EXISTS "report_approval_history_approverId_idx" ON "report_approval_history"("approverId");
CREATE INDEX IF NOT EXISTS "notifications_orgId_idx" ON "notifications"("orgId");
CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications"("read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");
CREATE INDEX IF NOT EXISTS "notification_channels_orgId_idx" ON "notification_channels"("orgId");
CREATE INDEX IF NOT EXISTS "notification_channels_userId_idx" ON "notification_channels"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "notification_channels_orgId_userId_type_key" ON "notification_channels"("orgId", "userId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_userId_key" ON "user_preferences"("userId");
CREATE INDEX IF NOT EXISTS "user_preferences_userId_idx" ON "user_preferences"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "org_details_orgId_key" ON "org_details"("orgId");
CREATE INDEX IF NOT EXISTS "org_details_orgId_idx" ON "org_details"("orgId");
CREATE UNIQUE INDEX IF NOT EXISTS "localization_settings_orgId_key" ON "localization_settings"("orgId");
CREATE INDEX IF NOT EXISTS "localization_settings_orgId_idx" ON "localization_settings"("orgId");
CREATE INDEX IF NOT EXISTS "connectors_auto_sync_enabled_last_synced_at_idx" ON "connectors"("auto_sync_enabled", "last_synced_at");
CREATE INDEX IF NOT EXISTS "excel_mappings_org_id_idx" ON "excel_mappings"("org_id");
CREATE INDEX IF NOT EXISTS "excel_syncs_org_id_idx" ON "excel_syncs"("org_id");
CREATE INDEX IF NOT EXISTS "exports_approval_status_idx" ON "exports"("approval_status");
CREATE INDEX IF NOT EXISTS "exports_orgId_approval_status_idx" ON "exports"("orgId", "approval_status");
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_idempotency_key_key" ON "jobs"("idempotency_key");
CREATE INDEX IF NOT EXISTS "jobs_idempotency_key_idx" ON "jobs"("idempotency_key");
CREATE INDEX IF NOT EXISTS "org_quotas_org_id_idx" ON "org_quotas"("org_id");

-- Add foreign keys (with IF NOT EXISTS check)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='report_approval_history_exportId_fkey') THEN
    ALTER TABLE "report_approval_history" ADD CONSTRAINT "report_approval_history_exportId_fkey" FOREIGN KEY ("exportId") REFERENCES "exports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='report_approval_history_approverId_fkey') THEN
    ALTER TABLE "report_approval_history" ADD CONSTRAINT "report_approval_history_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='board_report_schedules_org_id_fkey') THEN
    ALTER TABLE "board_report_schedules" ADD CONSTRAINT "board_report_schedules_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='board_report_schedules_created_by_id_fkey') THEN
    ALTER TABLE "board_report_schedules" ADD CONSTRAINT "board_report_schedules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='notifications_orgId_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='notification_channels_orgId_fkey') THEN
    ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='user_preferences_userId_fkey') THEN
    ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='org_details_orgId_fkey') THEN
    ALTER TABLE "org_details" ADD CONSTRAINT "org_details_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='localization_settings_orgId_fkey') THEN
    ALTER TABLE "localization_settings" ADD CONSTRAINT "localization_settings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='excel_syncs_org_id_fkey') THEN
    ALTER TABLE "excel_syncs" ADD CONSTRAINT "excel_syncs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='excel_syncs_mapping_id_fkey') THEN
    ALTER TABLE "excel_syncs" ADD CONSTRAINT "excel_syncs_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "excel_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='excel_mappings_org_id_fkey') THEN
    ALTER TABLE "excel_mappings" ADD CONSTRAINT "excel_mappings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='excel_mappings_created_by_fkey') THEN
    ALTER TABLE "excel_mappings" ADD CONSTRAINT "excel_mappings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='org_quotas_org_id_fkey') THEN
    ALTER TABLE "org_quotas" ADD CONSTRAINT "org_quotas_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='realtime_simulations_org_id_fkey') THEN
    ALTER TABLE "realtime_simulations" ADD CONSTRAINT "realtime_simulations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='realtime_simulations_user_id_fkey') THEN
    ALTER TABLE "realtime_simulations" ADD CONSTRAINT "realtime_simulations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


