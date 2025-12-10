-- CreateTable
CREATE TABLE IF NOT EXISTS "user_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "userId" UUID,
    "simulation_run_id" UUID,
    "monte_carlo_job_id" UUID,
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "credit_type" TEXT NOT NULL DEFAULT 'simulation',
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_usage_orgId_idx" ON "user_usage"("orgId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_usage_userId_idx" ON "user_usage"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_usage_orgId_created_at_idx" ON "user_usage"("orgId", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_usage_simulation_run_id_idx" ON "user_usage"("simulation_run_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_usage_monte_carlo_job_id_idx" ON "user_usage"("monte_carlo_job_id");

-- AddForeignKey
ALTER TABLE "user_usage" ADD CONSTRAINT "user_usage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_usage" ADD CONSTRAINT "user_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


