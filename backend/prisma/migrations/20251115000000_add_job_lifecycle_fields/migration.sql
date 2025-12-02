-- AlterTable: Add job lifecycle fields
ALTER TABLE "jobs" 
  ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS "queue" TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "max_attempts" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "last_error" TEXT,
  ADD COLUMN IF NOT EXISTS "next_run_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "worker_id" TEXT,
  ADD COLUMN IF NOT EXISTS "run_started_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "visibility_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "finished_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "cancel_requested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "billing_estimate" DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

-- Update status to NOT NULL with default
ALTER TABLE "jobs" 
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'queued';

-- Update progress to NOT NULL with default and precision
ALTER TABLE "jobs"
  ALTER COLUMN "progress" SET NOT NULL,
  ALTER COLUMN "progress" SET DEFAULT 0,
  ALTER COLUMN "progress" TYPE DECIMAL(5,2);

-- Create indexes
CREATE INDEX IF NOT EXISTS "jobs_status_idx" ON "jobs"("status");
CREATE INDEX IF NOT EXISTS "jobs_status_priority_created_at_idx" ON "jobs"("status", "priority", "created_at");
CREATE INDEX IF NOT EXISTS "jobs_status_next_run_at_idx" ON "jobs"("status", "next_run_at");
CREATE INDEX IF NOT EXISTS "jobs_queue_status_idx" ON "jobs"("queue", "status");
CREATE INDEX IF NOT EXISTS "jobs_worker_id_idx" ON "jobs"("worker_id");
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_idempotency_key_key" ON "jobs"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;


