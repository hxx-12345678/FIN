-- Migration to complete the snake_case conversion for all remaining columns
-- Generated programmatically to ensure 100% coverage of all @map attributes in schema.prisma

DO $$
BEGIN
    -- users
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'passwordHash') THEN
        ALTER TABLE "users" RENAME COLUMN "passwordHash" TO "password_hash";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'isActive') THEN
        ALTER TABLE "users" RENAME COLUMN "isActive" TO "is_active";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdAt') THEN
        ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lastLogin') THEN
        ALTER TABLE "users" RENAME COLUMN "lastLogin" TO "last_login";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfaEnabled') THEN
        ALTER TABLE "users" RENAME COLUMN "mfaEnabled" TO "mfa_enabled";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfaSecret') THEN
        ALTER TABLE "users" RENAME COLUMN "mfaSecret" TO "mfa_secret";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfaBackupCodes') THEN
        ALTER TABLE "users" RENAME COLUMN "mfaBackupCodes" TO "mfa_backup_codes";
    END IF;

    -- orgs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orgs' AND column_name = 'planTier') THEN
        ALTER TABLE "orgs" RENAME COLUMN "planTier" TO "plan_tier";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orgs' AND column_name = 'dataRegion') THEN
        ALTER TABLE "orgs" RENAME COLUMN "dataRegion" TO "data_region";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orgs' AND column_name = 'createdAt') THEN
        ALTER TABLE "orgs" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- user_org_roles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_org_roles' AND column_name = 'userId') THEN
        ALTER TABLE "user_org_roles" RENAME COLUMN "userId" TO "user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_org_roles' AND column_name = 'orgId') THEN
        ALTER TABLE "user_org_roles" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_org_roles' AND column_name = 'createdAt') THEN
        ALTER TABLE "user_org_roles" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- connectors
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'orgId') THEN
        ALTER TABLE "connectors" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'configJson') THEN
        ALTER TABLE "connectors" RENAME COLUMN "configJson" TO "config_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'encryptedConfig') THEN
        ALTER TABLE "connectors" RENAME COLUMN "encryptedConfig" TO "encrypted_config";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'lastSyncedAt') THEN
        ALTER TABLE "connectors" RENAME COLUMN "lastSyncedAt" TO "last_synced_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'createdAt') THEN
        ALTER TABLE "connectors" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'syncFrequencyHours') THEN
        ALTER TABLE "connectors" RENAME COLUMN "syncFrequencyHours" TO "sync_frequency_hours";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'autoSyncEnabled') THEN
        ALTER TABLE "connectors" RENAME COLUMN "autoSyncEnabled" TO "auto_sync_enabled";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'lastSyncStatus') THEN
        ALTER TABLE "connectors" RENAME COLUMN "lastSyncStatus" TO "last_sync_status";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'lastSyncError') THEN
        ALTER TABLE "connectors" RENAME COLUMN "lastSyncError" TO "last_sync_error";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connectors' AND column_name = 'updatedAt') THEN
        ALTER TABLE "connectors" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;

    -- raw_transactions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_transactions' AND column_name = 'orgId') THEN
        ALTER TABLE "raw_transactions" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_transactions' AND column_name = 'connectorId') THEN
        ALTER TABLE "raw_transactions" RENAME COLUMN "connectorId" TO "connector_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_transactions' AND column_name = 'sourceId') THEN
        ALTER TABLE "raw_transactions" RENAME COLUMN "sourceId" TO "source_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_transactions' AND column_name = 'rawPayload') THEN
        ALTER TABLE "raw_transactions" RENAME COLUMN "rawPayload" TO "raw_payload";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_transactions' AND column_name = 'importedAt') THEN
        ALTER TABLE "raw_transactions" RENAME COLUMN "importedAt" TO "imported_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_transactions' AND column_name = 'importBatchId') THEN
        ALTER TABLE "raw_transactions" RENAME COLUMN "importBatchId" TO "import_batch_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_transactions' AND column_name = 'isDuplicate') THEN
        ALTER TABLE "raw_transactions" RENAME COLUMN "isDuplicate" TO "is_duplicate";
    END IF;

    -- data_import_batches
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'data_import_batches' AND column_name = 'orgId') THEN
        ALTER TABLE "data_import_batches" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'data_import_batches' AND column_name = 'sourceType') THEN
        ALTER TABLE "data_import_batches" RENAME COLUMN "sourceType" TO "source_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'data_import_batches' AND column_name = 'sourceRef') THEN
        ALTER TABLE "data_import_batches" RENAME COLUMN "sourceRef" TO "source_ref";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'data_import_batches' AND column_name = 'fileHash') THEN
        ALTER TABLE "data_import_batches" RENAME COLUMN "fileHash" TO "file_hash";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'data_import_batches' AND column_name = 'mappingJson') THEN
        ALTER TABLE "data_import_batches" RENAME COLUMN "mappingJson" TO "mapping_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'data_import_batches' AND column_name = 'statsJson') THEN
        ALTER TABLE "data_import_batches" RENAME COLUMN "statsJson" TO "stats_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'data_import_batches' AND column_name = 'createdByUserId') THEN
        ALTER TABLE "data_import_batches" RENAME COLUMN "createdByUserId" TO "created_by_user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'data_import_batches' AND column_name = 'createdAt') THEN
        ALTER TABLE "data_import_batches" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- chart_of_accounts
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chart_of_accounts' AND column_name = 'orgId') THEN
        ALTER TABLE "chart_of_accounts" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chart_of_accounts' AND column_name = 'mappedToModelItem') THEN
        ALTER TABLE "chart_of_accounts" RENAME COLUMN "mappedToModelItem" TO "mapped_to_model_item";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chart_of_accounts' AND column_name = 'createdAt') THEN
        ALTER TABLE "chart_of_accounts" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- models
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'models' AND column_name = 'orgId') THEN
        ALTER TABLE "models" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'models' AND column_name = 'modelJson') THEN
        ALTER TABLE "models" RENAME COLUMN "modelJson" TO "model_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'models' AND column_name = 'createdById') THEN
        ALTER TABLE "models" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'models' AND column_name = 'createdAt') THEN
        ALTER TABLE "models" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- model_runs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'model_runs' AND column_name = 'modelId') THEN
        ALTER TABLE "model_runs" RENAME COLUMN "modelId" TO "model_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'model_runs' AND column_name = 'orgId') THEN
        ALTER TABLE "model_runs" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'model_runs' AND column_name = 'runType') THEN
        ALTER TABLE "model_runs" RENAME COLUMN "runType" TO "run_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'model_runs' AND column_name = 'paramsJson') THEN
        ALTER TABLE "model_runs" RENAME COLUMN "paramsJson" TO "params_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'model_runs' AND column_name = 'resultS3') THEN
        ALTER TABLE "model_runs" RENAME COLUMN "resultS3" TO "result_s3";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'model_runs' AND column_name = 'summaryJson') THEN
        ALTER TABLE "model_runs" RENAME COLUMN "summaryJson" TO "summary_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'model_runs' AND column_name = 'createdAt') THEN
        ALTER TABLE "model_runs" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'model_runs' AND column_name = 'finishedAt') THEN
        ALTER TABLE "model_runs" RENAME COLUMN "finishedAt" TO "finished_at";
    END IF;

    -- monte_carlo_jobs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'modelRunId') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "modelRunId" TO "model_run_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'orgId') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'numSimulations') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "numSimulations" TO "num_simulations";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'paramsHash') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "paramsHash" TO "params_hash";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'resultS3') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "resultS3" TO "result_s3";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'percentilesJson') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "percentilesJson" TO "percentiles_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'cpuSecondsEstimate') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "cpuSecondsEstimate" TO "cpu_seconds_estimate";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'createdAt') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'finishedAt') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "finishedAt" TO "finished_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'sensitivityJson') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "sensitivityJson" TO "sensitivity_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'confidenceLevel') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "confidenceLevel" TO "confidence_level";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monte_carlo_jobs' AND column_name = 'cpuSecondsActual') THEN
        ALTER TABLE "monte_carlo_jobs" RENAME COLUMN "cpuSecondsActual" TO "cpu_seconds_actual";
    END IF;

    -- drivers
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'orgId') THEN
        ALTER TABLE "drivers" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'modelId') THEN
        ALTER TABLE "drivers" RENAME COLUMN "modelId" TO "model_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'timeGranularity') THEN
        ALTER TABLE "drivers" RENAME COLUMN "timeGranularity" TO "time_granularity";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'isCalculated') THEN
        ALTER TABLE "drivers" RENAME COLUMN "isCalculated" TO "is_calculated";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'createdAt') THEN
        ALTER TABLE "drivers" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'updatedAt') THEN
        ALTER TABLE "drivers" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'isLocked') THEN
        ALTER TABLE "drivers" RENAME COLUMN "isLocked" TO "is_locked";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'maxRange') THEN
        ALTER TABLE "drivers" RENAME COLUMN "maxRange" TO "max_range";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'minRange') THEN
        ALTER TABLE "drivers" RENAME COLUMN "minRange" TO "min_range";
    END IF;

    -- driver_values
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_values' AND column_name = 'driverId') THEN
        ALTER TABLE "driver_values" RENAME COLUMN "driverId" TO "driver_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_values' AND column_name = 'scenarioId') THEN
        ALTER TABLE "driver_values" RENAME COLUMN "scenarioId" TO "scenario_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_values' AND column_name = 'createdAt') THEN
        ALTER TABLE "driver_values" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_values' AND column_name = 'updatedAt') THEN
        ALTER TABLE "driver_values" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;

    -- financial_scenarios
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_scenarios' AND column_name = 'orgId') THEN
        ALTER TABLE "financial_scenarios" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_scenarios' AND column_name = 'modelId') THEN
        ALTER TABLE "financial_scenarios" RENAME COLUMN "modelId" TO "model_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_scenarios' AND column_name = 'isDefault') THEN
        ALTER TABLE "financial_scenarios" RENAME COLUMN "isDefault" TO "is_default";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_scenarios' AND column_name = 'createdAt') THEN
        ALTER TABLE "financial_scenarios" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_scenarios' AND column_name = 'updatedAt') THEN
        ALTER TABLE "financial_scenarios" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;

    -- driver_formulas
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_formulas' AND column_name = 'orgId') THEN
        ALTER TABLE "driver_formulas" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_formulas' AND column_name = 'modelId') THEN
        ALTER TABLE "driver_formulas" RENAME COLUMN "modelId" TO "model_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_formulas' AND column_name = 'driverId') THEN
        ALTER TABLE "driver_formulas" RENAME COLUMN "driverId" TO "driver_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_formulas' AND column_name = 'createdAt') THEN
        ALTER TABLE "driver_formulas" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_formulas' AND column_name = 'updatedAt') THEN
        ALTER TABLE "driver_formulas" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;

    -- dimensions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimensions' AND column_name = 'orgId') THEN
        ALTER TABLE "dimensions" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimensions' AND column_name = 'modelId') THEN
        ALTER TABLE "dimensions" RENAME COLUMN "modelId" TO "model_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimensions' AND column_name = 'displayOrder') THEN
        ALTER TABLE "dimensions" RENAME COLUMN "displayOrder" TO "display_order";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimensions' AND column_name = 'createdAt') THEN
        ALTER TABLE "dimensions" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimensions' AND column_name = 'updatedAt') THEN
        ALTER TABLE "dimensions" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;

    -- dimension_members
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimension_members' AND column_name = 'dimensionId') THEN
        ALTER TABLE "dimension_members" RENAME COLUMN "dimensionId" TO "dimension_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimension_members' AND column_name = 'parentId') THEN
        ALTER TABLE "dimension_members" RENAME COLUMN "parentId" TO "parent_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimension_members' AND column_name = 'displayOrder') THEN
        ALTER TABLE "dimension_members" RENAME COLUMN "displayOrder" TO "display_order";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimension_members' AND column_name = 'isActive') THEN
        ALTER TABLE "dimension_members" RENAME COLUMN "isActive" TO "is_active";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimension_members' AND column_name = 'createdAt') THEN
        ALTER TABLE "dimension_members" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dimension_members' AND column_name = 'updatedAt') THEN
        ALTER TABLE "dimension_members" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;

    -- metric_cube
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'orgId') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'modelId') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "modelId" TO "model_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'metricName') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "metricName" TO "metric_name";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'geographyId') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "geographyId" TO "geography_id";
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
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'customDim1Id') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "customDim1Id" TO "custom_dim1_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'customDim2Id') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "customDim2Id" TO "custom_dim2_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'isCalculated') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "isCalculated" TO "is_calculated";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'createdAt') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metric_cube' AND column_name = 'updatedAt') THEN
        ALTER TABLE "metric_cube" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;

    -- prompts
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'orgId') THEN
        ALTER TABLE "prompts" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'userId') THEN
        ALTER TABLE "prompts" RENAME COLUMN "userId" TO "user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'promptTemplate') THEN
        ALTER TABLE "prompts" RENAME COLUMN "promptTemplate" TO "prompt_template";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'renderedPrompt') THEN
        ALTER TABLE "prompts" RENAME COLUMN "renderedPrompt" TO "rendered_prompt";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'responseText') THEN
        ALTER TABLE "prompts" RENAME COLUMN "responseText" TO "response_text";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'modelUsed') THEN
        ALTER TABLE "prompts" RENAME COLUMN "modelUsed" TO "model_used";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'tokensUsed') THEN
        ALTER TABLE "prompts" RENAME COLUMN "tokensUsed" TO "tokens_used";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'createdAt') THEN
        ALTER TABLE "prompts" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- provenance_entries
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provenance_entries' AND column_name = 'modelRunId') THEN
        ALTER TABLE "provenance_entries" RENAME COLUMN "modelRunId" TO "model_run_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provenance_entries' AND column_name = 'orgId') THEN
        ALTER TABLE "provenance_entries" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provenance_entries' AND column_name = 'cellKey') THEN
        ALTER TABLE "provenance_entries" RENAME COLUMN "cellKey" TO "cell_key";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provenance_entries' AND column_name = 'sourceType') THEN
        ALTER TABLE "provenance_entries" RENAME COLUMN "sourceType" TO "source_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provenance_entries' AND column_name = 'sourceRef') THEN
        ALTER TABLE "provenance_entries" RENAME COLUMN "sourceRef" TO "source_ref";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provenance_entries' AND column_name = 'promptId') THEN
        ALTER TABLE "provenance_entries" RENAME COLUMN "promptId" TO "prompt_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provenance_entries' AND column_name = 'confidenceScore') THEN
        ALTER TABLE "provenance_entries" RENAME COLUMN "confidenceScore" TO "confidence_score";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provenance_entries' AND column_name = 'createdAt') THEN
        ALTER TABLE "provenance_entries" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- exports
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'modelRunId') THEN
        ALTER TABLE "exports" RENAME COLUMN "modelRunId" TO "model_run_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'orgId') THEN
        ALTER TABLE "exports" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 's3Key') THEN
        ALTER TABLE "exports" RENAME COLUMN "s3Key" TO "s3_key";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'createdById') THEN
        ALTER TABLE "exports" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'createdAt') THEN
        ALTER TABLE "exports" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'provenanceAppendix') THEN
        ALTER TABLE "exports" RENAME COLUMN "provenanceAppendix" TO "provenance_appendix";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'fileData') THEN
        ALTER TABLE "exports" RENAME COLUMN "fileData" TO "file_data";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'metaJson') THEN
        ALTER TABLE "exports" RENAME COLUMN "metaJson" TO "meta_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exports' AND column_name = 'updatedAt') THEN
        ALTER TABLE "exports" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;

    -- jobs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'jobType') THEN
        ALTER TABLE "jobs" RENAME COLUMN "jobType" TO "job_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'orgId') THEN
        ALTER TABLE "jobs" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'objectId') THEN
        ALTER TABLE "jobs" RENAME COLUMN "objectId" TO "object_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'createdAt') THEN
        ALTER TABLE "jobs" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'updatedAt') THEN
        ALTER TABLE "jobs" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'maxAttempts') THEN
        ALTER TABLE "jobs" RENAME COLUMN "maxAttempts" TO "max_attempts";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'lastError') THEN
        ALTER TABLE "jobs" RENAME COLUMN "lastError" TO "last_error";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'nextRunAt') THEN
        ALTER TABLE "jobs" RENAME COLUMN "nextRunAt" TO "next_run_at";
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
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'finishedAt') THEN
        ALTER TABLE "jobs" RENAME COLUMN "finishedAt" TO "finished_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'cancelRequested') THEN
        ALTER TABLE "jobs" RENAME COLUMN "cancelRequested" TO "cancel_requested";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'createdByUserId') THEN
        ALTER TABLE "jobs" RENAME COLUMN "createdByUserId" TO "created_by_user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'billingEstimate') THEN
        ALTER TABLE "jobs" RENAME COLUMN "billingEstimate" TO "billing_estimate";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'idempotencyKey') THEN
        ALTER TABLE "jobs" RENAME COLUMN "idempotencyKey" TO "idempotency_key";
    END IF;

    -- board_report_schedules
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_report_schedules' AND column_name = 'orgId') THEN
        ALTER TABLE "board_report_schedules" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_report_schedules' AND column_name = 'scheduleType') THEN
        ALTER TABLE "board_report_schedules" RENAME COLUMN "scheduleType" TO "schedule_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_report_schedules' AND column_name = 'distributionMethod') THEN
        ALTER TABLE "board_report_schedules" RENAME COLUMN "distributionMethod" TO "distribution_method";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_report_schedules' AND column_name = 'ccRecipients') THEN
        ALTER TABLE "board_report_schedules" RENAME COLUMN "ccRecipients" TO "cc_recipients";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_report_schedules' AND column_name = 'nextRunAt') THEN
        ALTER TABLE "board_report_schedules" RENAME COLUMN "nextRunAt" TO "next_run_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_report_schedules' AND column_name = 'lastRunAt') THEN
        ALTER TABLE "board_report_schedules" RENAME COLUMN "lastRunAt" TO "last_run_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_report_schedules' AND column_name = 'createdById') THEN
        ALTER TABLE "board_report_schedules" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_report_schedules' AND column_name = 'createdAt') THEN
        ALTER TABLE "board_report_schedules" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_report_schedules' AND column_name = 'updatedAt') THEN
        ALTER TABLE "board_report_schedules" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;

    -- audit_logs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'actorUserId') THEN
        ALTER TABLE "audit_logs" RENAME COLUMN "actorUserId" TO "actor_user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'orgId') THEN
        ALTER TABLE "audit_logs" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'objectType') THEN
        ALTER TABLE "audit_logs" RENAME COLUMN "objectType" TO "object_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'objectId') THEN
        ALTER TABLE "audit_logs" RENAME COLUMN "objectId" TO "object_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'metaJson') THEN
        ALTER TABLE "audit_logs" RENAME COLUMN "metaJson" TO "meta_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'createdAt') THEN
        ALTER TABLE "audit_logs" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- share_tokens
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'share_tokens' AND column_name = 'orgId') THEN
        ALTER TABLE "share_tokens" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'share_tokens' AND column_name = 'expiresAt') THEN
        ALTER TABLE "share_tokens" RENAME COLUMN "expiresAt" TO "expires_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'share_tokens' AND column_name = 'createdById') THEN
        ALTER TABLE "share_tokens" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'share_tokens' AND column_name = 'createdAt') THEN
        ALTER TABLE "share_tokens" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- invitation_tokens
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation_tokens' AND column_name = 'orgId') THEN
        ALTER TABLE "invitation_tokens" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation_tokens' AND column_name = 'expiresAt') THEN
        ALTER TABLE "invitation_tokens" RENAME COLUMN "expiresAt" TO "expires_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation_tokens' AND column_name = 'usedAt') THEN
        ALTER TABLE "invitation_tokens" RENAME COLUMN "usedAt" TO "used_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation_tokens' AND column_name = 'createdById') THEN
        ALTER TABLE "invitation_tokens" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitation_tokens' AND column_name = 'createdAt') THEN
        ALTER TABLE "invitation_tokens" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- billing_usage
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_usage' AND column_name = 'orgId') THEN
        ALTER TABLE "billing_usage" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_usage' AND column_name = 'bucketTime') THEN
        ALTER TABLE "billing_usage" RENAME COLUMN "bucketTime" TO "bucket_time";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_usage' AND column_name = 'createdAt') THEN
        ALTER TABLE "billing_usage" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- alert_rules
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_rules' AND column_name = 'notifyEmail') THEN
        ALTER TABLE "alert_rules" RENAME COLUMN "notifyEmail" TO "notify_email";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_rules' AND column_name = 'notifySlack') THEN
        ALTER TABLE "alert_rules" RENAME COLUMN "notifySlack" TO "notify_slack";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_rules' AND column_name = 'slackWebhook') THEN
        ALTER TABLE "alert_rules" RENAME COLUMN "slackWebhook" TO "slack_webhook";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_rules' AND column_name = 'lastTriggered') THEN
        ALTER TABLE "alert_rules" RENAME COLUMN "lastTriggered" TO "last_triggered";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_rules' AND column_name = 'createdAt') THEN
        ALTER TABLE "alert_rules" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_rules' AND column_name = 'updatedAt') THEN
        ALTER TABLE "alert_rules" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_rules' AND column_name = 'createdById') THEN
        ALTER TABLE "alert_rules" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_rules' AND column_name = 'orgId') THEN
        ALTER TABLE "alert_rules" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- ai_cfo_plans
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_plans' AND column_name = 'planJson') THEN
        ALTER TABLE "ai_cfo_plans" RENAME COLUMN "planJson" TO "plan_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_plans' AND column_name = 'createdAt') THEN
        ALTER TABLE "ai_cfo_plans" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_plans' AND column_name = 'updatedAt') THEN
        ALTER TABLE "ai_cfo_plans" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_plans' AND column_name = 'createdById') THEN
        ALTER TABLE "ai_cfo_plans" RENAME COLUMN "createdById" TO "created_by_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_plans' AND column_name = 'modelRunId') THEN
        ALTER TABLE "ai_cfo_plans" RENAME COLUMN "modelRunId" TO "model_run_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_plans' AND column_name = 'orgId') THEN
        ALTER TABLE "ai_cfo_plans" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- ai_cfo_conversations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_conversations' AND column_name = 'createdAt') THEN
        ALTER TABLE "ai_cfo_conversations" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_conversations' AND column_name = 'updatedAt') THEN
        ALTER TABLE "ai_cfo_conversations" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
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
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_messages' AND column_name = 'createdAt') THEN
        ALTER TABLE "ai_cfo_messages" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_cfo_messages' AND column_name = 'conversationId') THEN
        ALTER TABLE "ai_cfo_messages" RENAME COLUMN "conversationId" TO "conversation_id";
    END IF;

    -- computation_traces
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'computation_traces' AND column_name = 'orgId') THEN
        ALTER TABLE "computation_traces" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'computation_traces' AND column_name = 'modelId') THEN
        ALTER TABLE "computation_traces" RENAME COLUMN "modelId" TO "model_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'computation_traces' AND column_name = 'triggerNodeId') THEN
        ALTER TABLE "computation_traces" RENAME COLUMN "triggerNodeId" TO "trigger_node_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'computation_traces' AND column_name = 'triggerUserId') THEN
        ALTER TABLE "computation_traces" RENAME COLUMN "triggerUserId" TO "trigger_user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'computation_traces' AND column_name = 'affectedNodes') THEN
        ALTER TABLE "computation_traces" RENAME COLUMN "affectedNodes" TO "affected_nodes";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'computation_traces' AND column_name = 'durationMs') THEN
        ALTER TABLE "computation_traces" RENAME COLUMN "durationMs" TO "duration_ms";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'computation_traces' AND column_name = 'createdAt') THEN
        ALTER TABLE "computation_traces" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- forecasts
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forecasts' AND column_name = 'orgId') THEN
        ALTER TABLE "forecasts" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forecasts' AND column_name = 'modelId') THEN
        ALTER TABLE "forecasts" RENAME COLUMN "modelId" TO "model_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forecasts' AND column_name = 'metricName') THEN
        ALTER TABLE "forecasts" RENAME COLUMN "metricName" TO "metric_name";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forecasts' AND column_name = 'forecastData') THEN
        ALTER TABLE "forecasts" RENAME COLUMN "forecastData" TO "forecast_data";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forecasts' AND column_name = 'historicalData') THEN
        ALTER TABLE "forecasts" RENAME COLUMN "historicalData" TO "historical_data";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forecasts' AND column_name = 'createdAt') THEN
        ALTER TABLE "forecasts" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- notifications
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'orgId') THEN
        ALTER TABLE "notifications" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'userId') THEN
        ALTER TABLE "notifications" RENAME COLUMN "userId" TO "user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'readAt') THEN
        ALTER TABLE "notifications" RENAME COLUMN "readAt" TO "read_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'createdAt') THEN
        ALTER TABLE "notifications" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- notification_channels
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_channels' AND column_name = 'orgId') THEN
        ALTER TABLE "notification_channels" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_channels' AND column_name = 'userId') THEN
        ALTER TABLE "notification_channels" RENAME COLUMN "userId" TO "user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_channels' AND column_name = 'configJson') THEN
        ALTER TABLE "notification_channels" RENAME COLUMN "configJson" TO "config_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_channels' AND column_name = 'createdAt') THEN
        ALTER TABLE "notification_channels" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_channels' AND column_name = 'updatedAt') THEN
        ALTER TABLE "notification_channels" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;

    -- org_settings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_settings' AND column_name = 'orgId') THEN
        ALTER TABLE "org_settings" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_settings' AND column_name = 'dataRetentionDays') THEN
        ALTER TABLE "org_settings" RENAME COLUMN "dataRetentionDays" TO "data_retention_days";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_settings' AND column_name = 'updatedById') THEN
        ALTER TABLE "org_settings" RENAME COLUMN "updatedById" TO "updated_by_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_settings' AND column_name = 'updatedAt') THEN
        ALTER TABLE "org_settings" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_settings' AND column_name = 'complianceJson') THEN
        ALTER TABLE "org_settings" RENAME COLUMN "complianceJson" TO "compliance_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_settings' AND column_name = 'securityControlsJson') THEN
        ALTER TABLE "org_settings" RENAME COLUMN "securityControlsJson" TO "security_controls_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_settings' AND column_name = 'policiesJson') THEN
        ALTER TABLE "org_settings" RENAME COLUMN "policiesJson" TO "policies_json";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'org_settings' AND column_name = 'metaJson') THEN
        ALTER TABLE "org_settings" RENAME COLUMN "metaJson" TO "meta_json";
    END IF;

    -- user_preferences
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'userId') THEN
        ALTER TABLE "user_preferences" RENAME COLUMN "userId" TO "user_id";
    END IF;

    -- localization_settings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'localization_settings' AND column_name = 'orgId') THEN
        ALTER TABLE "localization_settings" RENAME COLUMN "orgId" TO "org_id";
    END IF;

    -- headcount_plans
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'headcount_plans' AND column_name = 'orgId') THEN
        ALTER TABLE "headcount_plans" RENAME COLUMN "orgId" TO "org_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'headcount_plans' AND column_name = 'benefitsMultiplier') THEN
        ALTER TABLE "headcount_plans" RENAME COLUMN "benefitsMultiplier" TO "benefits_multiplier";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'headcount_plans' AND column_name = 'totalAnnualCost') THEN
        ALTER TABLE "headcount_plans" RENAME COLUMN "totalAnnualCost" TO "total_annual_cost";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'headcount_plans' AND column_name = 'startDate') THEN
        ALTER TABLE "headcount_plans" RENAME COLUMN "startDate" TO "start_date";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'headcount_plans' AND column_name = 'endDate') THEN
        ALTER TABLE "headcount_plans" RENAME COLUMN "endDate" TO "end_date";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'headcount_plans' AND column_name = 'rampMonths') THEN
        ALTER TABLE "headcount_plans" RENAME COLUMN "rampMonths" TO "ramp_months";
    END IF;

END $$;
