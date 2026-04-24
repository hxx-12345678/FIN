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
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provenance_entries' AND column_name = 'promptId') THEN
        ALTER TABLE "provenance_entries" RENAME COLUMN "promptId" TO "prompt_id";
    END IF;

    -- exports
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'orgId') THEN
        ALTER TABLE "exports" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'modelRunId') THEN
        ALTER TABLE "exports" RENAME COLUMN "modelRunId" TO "model_run_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'createdById') THEN
        ALTER TABLE "exports" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;

    -- jobs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'orgId') THEN
        ALTER TABLE "jobs" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'workerId') THEN
        ALTER TABLE "jobs" RENAME COLUMN "workerId" TO "worker_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'runStartedAt') THEN
        ALTER TABLE "jobs" RENAME COLUMN "runStartedAt" TO "run_started_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'visibilityExpiresAt') THEN
        ALTER TABLE "jobs" RENAME COLUMN "visibilityExpiresAt" TO "visibility_expires_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'nextRunAt') THEN
        ALTER TABLE "jobs" RENAME COLUMN "nextRunAt" TO "next_run_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'cancelRequested') THEN
        ALTER TABLE "jobs" RENAME COLUMN "cancelRequested" TO "cancel_requested";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'createdAt') THEN
        ALTER TABLE "jobs" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'updatedAt') THEN
        ALTER TABLE "jobs" RENAME COLUMN "updatedAt" TO "updated_at";
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

    -- notifications
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'orgId') THEN
        ALTER TABLE "notifications" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'userId') THEN
        ALTER TABLE "notifications" RENAME COLUMN "userId" TO "user_id";
    END IF;

    -- org_details
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_details' AND column_name = 'orgId') THEN
        ALTER TABLE "org_details" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- localization_settings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'localization_settings' AND column_name = 'orgId') THEN
        ALTER TABLE "localization_settings" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- headcount_plans
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'headcount_plans' AND column_name = 'orgId') THEN
        ALTER TABLE "headcount_plans" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'headcount_plans' AND column_name = 'createdById') THEN
        ALTER TABLE "headcount_plans" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;

    -- consolidation_entities
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consolidation_entities' AND column_name = 'orgId') THEN
        ALTER TABLE "consolidation_entities" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- budgets
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'orgId') THEN
        ALTER TABLE "budgets" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'createdById') THEN
        ALTER TABLE "budgets" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;

    -- excel_syncs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'excel_syncs' AND column_name = 'orgId') THEN
        ALTER TABLE "excel_syncs" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- excel_mappings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'excel_mappings' AND column_name = 'orgId') THEN
        ALTER TABLE "excel_mappings" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'excel_mappings' AND column_name = 'createdById') THEN
        ALTER TABLE "excel_mappings" RENAME COLUMN "createdById" TO "created_by";
    END IF;

    -- org_quotas
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_quotas' AND column_name = 'orgId') THEN
        ALTER TABLE "org_quotas" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- realtime_simulations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'realtime_simulations' AND column_name = 'orgId') THEN
        ALTER TABLE "realtime_simulations" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'realtime_simulations' AND column_name = 'userId') THEN
        ALTER TABLE "realtime_simulations" RENAME COLUMN "userId" TO "user_id";
    END IF;

    -- user_usage
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_usage' AND column_name = 'orgId') THEN
        ALTER TABLE "user_usage" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_usage' AND column_name = 'userId') THEN
        ALTER TABLE "user_usage" RENAME COLUMN "userId" TO "user_id";
    END IF;

    -- financial_ledger
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_ledger' AND column_name = 'orgId') THEN
        ALTER TABLE "financial_ledger" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- approval_requests
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approval_requests' AND column_name = 'orgId') THEN
        ALTER TABLE "approval_requests" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- access_requests
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_requests' AND column_name = 'orgId') THEN
        ALTER TABLE "access_requests" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- org_settings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_settings' AND column_name = 'orgId') THEN
        ALTER TABLE "org_settings" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_settings' AND column_name = 'updatedById') THEN
        ALTER TABLE "org_settings" RENAME COLUMN "updatedById" TO "updated_by_id";
    END IF;

END $$;
