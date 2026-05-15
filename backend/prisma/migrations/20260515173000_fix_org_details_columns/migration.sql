-- AlterTable
ALTER TABLE "org_details" ADD COLUMN IF NOT EXISTS "tax_id" TEXT;
ALTER TABLE "org_details" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "org_details" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "org_details" ADD COLUMN IF NOT EXISTS "address" TEXT;
