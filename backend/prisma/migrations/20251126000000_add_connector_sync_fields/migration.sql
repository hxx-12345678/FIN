-- AlterTable
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS "sync_frequency_hours" INTEGER DEFAULT 24;
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS "auto_sync_enabled" BOOLEAN DEFAULT true;
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS "last_sync_status" VARCHAR(50);
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS "last_sync_error" TEXT;

