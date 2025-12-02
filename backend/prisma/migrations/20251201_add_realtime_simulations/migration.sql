-- Create realtime_simulations table for storing simulation state
-- Migration: add_realtime_simulations
-- Date: 2025-12-01

CREATE TABLE IF NOT EXISTS "realtime_simulations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" VARCHAR(255),
  "params_json" JSONB NOT NULL,
  "results_json" JSONB NOT NULL,
  "current_month" INTEGER DEFAULT 0,
  "is_running" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ(6) DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_realtime_simulations_org" ON "realtime_simulations"("org_id");
CREATE INDEX IF NOT EXISTS "idx_realtime_simulations_user" ON "realtime_simulations"("user_id");
CREATE INDEX IF NOT EXISTS "idx_realtime_simulations_updated" ON "realtime_simulations"("updated_at" DESC);

COMMENT ON TABLE "realtime_simulations" IS 'Stores real-time financial simulation state and results';

