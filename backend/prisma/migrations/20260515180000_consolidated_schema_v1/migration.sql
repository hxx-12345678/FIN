-- AlterTable: Add missing columns to org_details
ALTER TABLE "org_details" ADD COLUMN IF NOT EXISTS "tax_id" TEXT;
ALTER TABLE "org_details" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "org_details" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "org_details" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "org_details" ADD COLUMN IF NOT EXISTS "company_size" TEXT;
ALTER TABLE "org_details" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "org_details" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Add missing columns to localization_settings
ALTER TABLE "localization_settings" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "localization_settings" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
