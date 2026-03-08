/*
  Warnings:

  - A unique constraint covering the columns `[idempotency_key]` on the table `jobs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orgId,source_id]` on the table `raw_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "dependencies" JSONB,
ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_range" DECIMAL(20,4),
ADD COLUMN     "min_range" DECIMAL(20,4);

-- CreateIndex
DROP INDEX IF EXISTS "jobs_idempotency_key_key";
CREATE UNIQUE INDEX "jobs_idempotency_key_key" ON "jobs"("idempotency_key");

-- CreateIndex
DROP INDEX IF EXISTS "jobs_idempotency_key_idx";
CREATE INDEX "jobs_idempotency_key_idx" ON "jobs"("idempotency_key");

-- CreateIndex
DROP INDEX IF EXISTS "raw_transactions_orgId_source_id_key";
CREATE UNIQUE INDEX "raw_transactions_orgId_source_id_key" ON "raw_transactions"("orgId", "source_id");
