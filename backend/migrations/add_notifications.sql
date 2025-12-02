-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    CONSTRAINT "notifications_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE
);

-- Create notification_channels table
CREATE TABLE IF NOT EXISTS "notification_channels" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "userId" UUID,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_channels_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE,
    CONSTRAINT "notification_channel_unique" UNIQUE ("orgId", "userId", "type")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "notifications_orgId_idx" ON "notifications"("orgId");
CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications"("read");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("created_at");
CREATE INDEX IF NOT EXISTS "notification_channels_orgId_idx" ON "notification_channels"("orgId");
CREATE INDEX IF NOT EXISTS "notification_channels_userId_idx" ON "notification_channels"("userId");

