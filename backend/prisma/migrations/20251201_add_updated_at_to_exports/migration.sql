-- AlterTable
ALTER TABLE "exports" ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "exports_status_idx" ON "exports"("status");


