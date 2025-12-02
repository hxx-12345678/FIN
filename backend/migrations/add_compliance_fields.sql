-- Add compliance fields to org_settings table
ALTER TABLE "org_settings" 
ADD COLUMN IF NOT EXISTS "compliance_json" JSONB,
ADD COLUMN IF NOT EXISTS "security_controls_json" JSONB,
ADD COLUMN IF NOT EXISTS "policies_json" JSONB;

