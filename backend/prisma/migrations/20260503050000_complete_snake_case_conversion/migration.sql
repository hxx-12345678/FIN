-- Migration to complete the snake_case conversion for all remaining columns
-- This fixes columns missed in previous migrations to ensure full consistency.

DO $$
BEGIN
    -- user_org_roles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_org_roles' AND column_name = 'userId') THEN
        ALTER TABLE "user_org_roles" RENAME COLUMN "userId" TO "user_id";
    END IF;

    -- raw_transactions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_transactions' AND column_name = 'connectorId') THEN
        ALTER TABLE "raw_transactions" RENAME COLUMN "connectorId" TO "connector_id";
    END IF;

    -- model_runs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'model_runs' AND column_name = 'modelId') THEN
        ALTER TABLE "model_runs" RENAME COLUMN "modelId" TO "model_id";
    END IF;

    -- monte_carlo_jobs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'modelRunId') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "modelRunId" TO "model_run_id";
    END IF;

    -- drivers
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'modelId') THEN
        ALTER TABLE "drivers" RENAME COLUMN "modelId" TO "model_id";
    END IF;

    -- driver_values
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_values' AND column_name = 'driverId') THEN
        ALTER TABLE "driver_values" RENAME COLUMN "driverId" TO "driver_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_values' AND column_name = 'scenarioId') THEN
        ALTER TABLE "driver_values" RENAME COLUMN "scenarioId" TO "scenario_id";
    END IF;

    -- financial_scenarios
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_scenarios' AND column_name = 'modelId') THEN
        ALTER TABLE "financial_scenarios" RENAME COLUMN "modelId" TO "model_id";
    END IF;

    -- driver_formulas
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_formulas' AND column_name = 'modelId') THEN
        ALTER TABLE "driver_formulas" RENAME COLUMN "modelId" TO "model_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_formulas' AND column_name = 'driverId') THEN
        ALTER TABLE "driver_formulas" RENAME COLUMN "driverId" TO "driver_id";
    END IF;

    -- dimensions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimensions' AND column_name = 'modelId') THEN
        ALTER TABLE "dimensions" RENAME COLUMN "modelId" TO "model_id";
    END IF;

    -- dimension_members
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimension_members' AND column_name = 'dimensionId') THEN
        ALTER TABLE "dimension_members" RENAME COLUMN "dimensionId" TO "dimension_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimension_members' AND column_name = 'parentId') THEN
        ALTER TABLE "dimension_members" RENAME COLUMN "parentId" TO "parent_id";
    END IF;

    -- metric_cube
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'modelId') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "modelId" TO "model_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'productId') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "productId" TO "product_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'departmentId') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "departmentId" TO "department_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'segmentId') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "segmentId" TO "segment_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'channelId') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "channelId" TO "channel_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'scenarioId') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "scenarioId" TO "scenario_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'geographyId') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "geographyId" TO "geography_id";
    END IF;

    -- provenance_entries
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provenance_entries' AND column_name = 'modelRunId') THEN
        ALTER TABLE "provenance_entries" RENAME COLUMN "modelRunId" TO "model_run_id";
    END IF;

    -- computation_traces
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'computation_traces' AND column_name = 'orgId') THEN
        ALTER TABLE "computation_traces" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'computation_traces' AND column_name = 'modelId') THEN
        ALTER TABLE "computation_traces" RENAME COLUMN "modelId" TO "model_id";
    END IF;

    -- forecasts
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forecasts' AND column_name = 'modelId') THEN
        ALTER TABLE "forecasts" RENAME COLUMN "modelId" TO "model_id";
    END IF;

    -- ai_cfo_conversations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_conversations' AND column_name = 'orgId') THEN
        ALTER TABLE "ai_cfo_conversations" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_conversations' AND column_name = 'userId') THEN
        ALTER TABLE "ai_cfo_conversations" RENAME COLUMN "userId" TO "user_id";
    END IF;

    -- ai_cfo_messages
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_messages' AND column_name = 'agentType') THEN
        ALTER TABLE "ai_cfo_messages" RENAME COLUMN "agentType" TO "agent_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_messages' AND column_name = 'dataSources') THEN
        ALTER TABLE "ai_cfo_messages" RENAME COLUMN "dataSources" TO "data_sources";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_messages' AND column_name = 'conversationId') THEN
        ALTER TABLE "ai_cfo_messages" RENAME COLUMN "conversationId" TO "conversation_id";
    END IF;

    -- ai_cfo_plans
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_plans' AND column_name = 'orgId') THEN
        ALTER TABLE "ai_cfo_plans" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_plans' AND column_name = 'createdById') THEN
        ALTER TABLE "ai_cfo_plans" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_plans' AND column_name = 'modelRunId') THEN
        ALTER TABLE "ai_cfo_plans" RENAME COLUMN "modelRunId" TO "model_run_id";
    END IF;

    -- approval_requests
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approval_requests' AND column_name = 'requesterId') THEN
        ALTER TABLE "approval_requests" RENAME COLUMN "requesterId" TO "requester_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approval_requests' AND column_name = 'approverId') THEN
        ALTER TABLE "approval_requests" RENAME COLUMN "approverId" TO "approver_id";
    END IF;

END $$;
