-- Migration: Add Report Approval Workflow
-- Adds Abacum-style approval workflow to exports table

-- Add approval workflow columns to exports table
ALTER TABLE "exports" 
ADD COLUMN IF NOT EXISTS "approval_status" TEXT DEFAULT 'draft' CHECK ("approval_status" IN ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
ADD COLUMN IF NOT EXISTS "approval_required" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "approver_ids" UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN IF NOT EXISTS "approved_by" UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN IF NOT EXISTS "rejected_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "parent_export_id" UUID REFERENCES "exports"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "distribution_list" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "distribution_method" TEXT CHECK ("distribution_method" IN ('email', 'slack', 'download', 'share_link')),
ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "schedule_frequency" TEXT CHECK ("schedule_frequency" IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'));

-- Create indexes for approval queries
CREATE INDEX IF NOT EXISTS "exports_approval_status_idx" ON "exports" ("approval_status");
CREATE INDEX IF NOT EXISTS "exports_org_approval_idx" ON "exports" ("orgId", "approval_status");

-- Create report approval history table
CREATE TABLE IF NOT EXISTS "report_approval_history" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "export_id" UUID NOT NULL REFERENCES "exports"("id") ON DELETE CASCADE,
    "approver_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "action" TEXT NOT NULL CHECK ("action" IN ('approve', 'reject', 'request_changes')),
    "comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "report_approval_history_export_idx" ON "report_approval_history" ("export_id");
CREATE INDEX IF NOT EXISTS "report_approval_history_approver_idx" ON "report_approval_history" ("approver_id");

