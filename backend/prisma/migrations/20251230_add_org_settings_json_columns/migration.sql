-- Add missing JSON columns to org_settings table
-- Safe migration: uses IF NOT EXISTS to prevent errors if columns already exist
-- Date: 2025-12-30

ALTER TABLE IF EXISTS "org_settings"
  ADD COLUMN IF NOT EXISTS "compliance_json" JSONB;

ALTER TABLE IF EXISTS "org_settings"
  ADD COLUMN IF NOT EXISTS "security_controls_json" JSONB;

ALTER TABLE IF EXISTS "org_settings"
  ADD COLUMN IF NOT EXISTS "policies_json" JSONB;

ALTER TABLE IF EXISTS "org_settings"
  ADD COLUMN IF NOT EXISTS "meta_json" JSONB;

