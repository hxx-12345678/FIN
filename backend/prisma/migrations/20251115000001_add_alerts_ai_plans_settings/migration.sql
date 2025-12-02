-- CreateTable: AlertRule
CREATE TABLE IF NOT EXISTS "alert_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metric" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "threshold" DECIMAL(20,4) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notify_email" BOOLEAN NOT NULL DEFAULT false,
    "notify_slack" BOOLEAN NOT NULL DEFAULT false,
    "slack_webhook" TEXT,
    "last_triggered" TIMESTAMPTZ(6),
    "createdById" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AICFOPlan
CREATE TABLE IF NOT EXISTS "ai_cfo_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "modelRunId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "plan_json" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "ai_cfo_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OrgSettings
CREATE TABLE IF NOT EXISTS "org_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "data_retention_days" INTEGER NOT NULL DEFAULT 365,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "region" TEXT NOT NULL DEFAULT 'global',
    "updatedById" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "org_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "alert_rules_orgId_idx" ON "alert_rules"("orgId");
CREATE INDEX IF NOT EXISTS "alert_rules_enabled_idx" ON "alert_rules"("enabled");
CREATE INDEX IF NOT EXISTS "ai_cfo_plans_orgId_idx" ON "ai_cfo_plans"("orgId");
CREATE INDEX IF NOT EXISTS "ai_cfo_plans_status_idx" ON "ai_cfo_plans"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "org_settings_orgId_key" ON "org_settings"("orgId");

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_cfo_plans" ADD CONSTRAINT "ai_cfo_plans_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_cfo_plans" ADD CONSTRAINT "ai_cfo_plans_modelRunId_fkey" FOREIGN KEY ("modelRunId") REFERENCES "model_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_cfo_plans" ADD CONSTRAINT "ai_cfo_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "org_settings" ADD CONSTRAINT "org_settings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_settings" ADD CONSTRAINT "org_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


