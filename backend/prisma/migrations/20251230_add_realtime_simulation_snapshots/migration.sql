-- Add snapshot support to realtime_simulations
-- Safe migration: uses IF NOT EXISTS to avoid failures if schema was previously applied via db push
-- Date: 2025-12-30

ALTER TABLE IF EXISTS "realtime_simulations"
  ADD COLUMN IF NOT EXISTS "is_snapshot" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS "realtime_simulations"
  ADD COLUMN IF NOT EXISTS "snapshot_token" TEXT;

-- Prisma expects snapshot_token to be unique (used by findUnique)
-- Postgres UNIQUE allows multiple NULLs, so existing rows are safe.
CREATE UNIQUE INDEX IF NOT EXISTS "realtime_simulations_snapshot_token_key"
  ON "realtime_simulations" ("snapshot_token");

CREATE INDEX IF NOT EXISTS "idx_realtime_simulations_snapshot_token"
  ON "realtime_simulations" ("snapshot_token");



