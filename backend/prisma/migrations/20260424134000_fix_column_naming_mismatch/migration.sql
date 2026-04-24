-- Migration to fix column naming mismatches between Prisma schema and database
-- Renames 'orgId' to 'org_id' and other camelCase columns to snake_case where @map is used.

DO $$
BEGIN
    -- user_org_roles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_org_roles' AND column_name = 'orgId') THEN
        ALTER TABLE "user_org_roles" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_org_roles_orgId_idx') THEN
        ALTER INDEX "user_org_roles_orgId_idx" RENAME TO "user_org_roles_org_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_org_roles_userId_orgId_key') THEN
        ALTER INDEX "user_org_roles_userId_orgId_key" RENAME TO "user_org_roles_userId_org_id_key";
    END IF;

    -- connectors
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'orgId') THEN
        ALTER TABLE "connectors" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'connectors_orgId_idx') THEN
        ALTER INDEX "connectors_orgId_idx" RENAME TO "connectors_org_id_idx";
    END IF;

    -- raw_transactions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_transactions' AND column_name = 'orgId') THEN
        ALTER TABLE "raw_transactions" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'raw_transactions_orgId_idx') THEN
        ALTER INDEX "raw_transactions_orgId_idx" RENAME TO "raw_transactions_org_id_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'raw_transactions_org_date_idx') THEN
        -- This index uses both orgId and date. Rename it for consistency.
        ALTER INDEX "raw_transactions_org_date_idx" RENAME TO "raw_transactions_org_id_date_idx";
    END IF;

    -- data_import_batches
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'data_import_batches' AND column_name = 'orgId') THEN
        ALTER TABLE "data_import_batches" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- chart_of_accounts
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chart_of_accounts' AND column_name = 'orgId') THEN
        ALTER TABLE "chart_of_accounts" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- models
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'models' AND column_name = 'orgId') THEN
        ALTER TABLE "models" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'models' AND column_name = 'createdById') THEN
        ALTER TABLE "models" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;

    -- model_runs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'model_runs' AND column_name = 'orgId') THEN
        ALTER TABLE "model_runs" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- monte_carlo_jobs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'orgId') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- drivers
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'orgId') THEN
        ALTER TABLE "drivers" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- financial_scenarios
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_scenarios' AND column_name = 'orgId') THEN
        ALTER TABLE "financial_scenarios" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- driver_formulas
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_formulas' AND column_name = 'orgId') THEN
        ALTER TABLE "driver_formulas" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- dimensions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimensions' AND column_name = 'orgId') THEN
        ALTER TABLE "dimensions" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- metric_cube
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'orgId') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- prompts
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'orgId') THEN
        ALTER TABLE "prompts" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- provenance_entries
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provenance_entries' AND column_name = 'orgId') THEN
        ALTER TABLE "provenance_entries" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- exports
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'orgId') THEN
        ALTER TABLE "exports" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'createdById') THEN
        ALTER TABLE "exports" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;

    -- jobs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'orgId') THEN
        ALTER TABLE "jobs" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- board_report_schedules
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_report_schedules' AND column_name = 'orgId') THEN
        ALTER TABLE "board_report_schedules" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_report_schedules' AND column_name = 'createdById') THEN
        ALTER TABLE "board_report_schedules" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;

    -- audit_logs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'orgId') THEN
        ALTER TABLE "audit_logs" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- share_tokens
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'share_tokens' AND column_name = 'orgId') THEN
        ALTER TABLE "share_tokens" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'share_tokens' AND column_name = 'createdById') THEN
        ALTER TABLE "share_tokens" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;

    -- invitation_tokens
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation_tokens' AND column_name = 'orgId') THEN
        ALTER TABLE "invitation_tokens" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation_tokens' AND column_name = 'createdById') THEN
        ALTER TABLE "invitation_tokens" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;

    -- billing_usage
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_usage' AND column_name = 'orgId') THEN
        ALTER TABLE "billing_usage" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- alert_rules
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_rules' AND column_name = 'orgId') THEN
        ALTER TABLE "alert_rules" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_rules' AND column_name = 'createdById') THEN
        ALTER TABLE "alert_rules" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;

    -- ai_cfo_conversations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_conversations' AND column_name = 'orgId') THEN
        ALTER TABLE "ai_cfo_conversations" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_conversations' AND column_name = 'userId') THEN
        ALTER TABLE "ai_cfo_conversations" RENAME COLUMN "userId" TO "user_id";
    END IF;

    -- ai_cfo_messages
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_messages' AND column_name = 'conversationId') THEN
        ALTER TABLE "ai_cfo_messages" RENAME COLUMN "conversationId" TO "conversation_id";
    END IF;

    -- org_settings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_settings' AND column_name = 'orgId') THEN
        ALTER TABLE "org_settings" RENAME COLUMN "orgId" TO "org_id";
    END IF;

END $$;
