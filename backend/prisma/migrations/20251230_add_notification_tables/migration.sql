-- Create Notification and NotificationChannel tables
-- Safe migration: uses IF NOT EXISTS to prevent errors if tables already exist
-- Date: 2025-12-30

-- CreateTable: notifications
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "userId" UUID,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_channels
CREATE TABLE IF NOT EXISTS "notification_channels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "userId" UUID,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (Safe: uses IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "notifications_orgId_idx" ON "notifications"("orgId");
CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications"("read");
CREATE INDEX IF NOT EXISTS "notification_channels_orgId_idx" ON "notification_channels"("orgId");
CREATE INDEX IF NOT EXISTS "notification_channels_userId_idx" ON "notification_channels"("userId");

-- CreateUniqueIndex (Safe: uses IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "notification_channel_unique" ON "notification_channels"("orgId", "userId", "type");

-- AddForeignKey (Safe: checks if constraint exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_orgId_fkey'
    ) THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_orgId_fkey" 
            FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_userId_fkey'
    ) THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notification_channels_orgId_fkey'
    ) THEN
        ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_orgId_fkey" 
            FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notification_channels_userId_fkey'
    ) THEN
        ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

