-- Create table for scheduled board reports
CREATE TABLE "board_report_schedules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "schedule_type" TEXT NOT NULL DEFAULT 'single',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "distribution_method" TEXT,
    "recipients" TEXT,
    "cc_recipients" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "next_run_at" TIMESTAMPTZ,
    "last_run_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "board_report_schedules_org_idx" ON "board_report_schedules" ("org_id");
CREATE INDEX "board_report_schedules_status_idx" ON "board_report_schedules" ("status");
CREATE INDEX "board_report_schedules_next_run_idx" ON "board_report_schedules" ("next_run_at");

