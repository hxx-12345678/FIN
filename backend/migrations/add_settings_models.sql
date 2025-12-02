-- Add UserPreferences table for user profile extensions
CREATE TABLE IF NOT EXISTS "user_preferences" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL UNIQUE,
    "phone" TEXT,
    "job_title" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "appearance_json" JSONB, -- theme, themeColor, fontSize, dateFormat, animations
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Add OrgDetails table for organization extensions
CREATE TABLE IF NOT EXISTS "org_details" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL UNIQUE,
    "industry" TEXT,
    "company_size" TEXT,
    "website" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "org_details_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE
);

-- Add LocalizationSettings table for comprehensive localization
CREATE TABLE IF NOT EXISTS "localization_settings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL UNIQUE,
    "base_currency" TEXT NOT NULL DEFAULT 'USD',
    "display_currency" TEXT NOT NULL DEFAULT 'USD',
    "language" TEXT NOT NULL DEFAULT 'en',
    "date_format" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "number_format" TEXT NOT NULL DEFAULT '1,234.56',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "auto_fx_update" BOOLEAN DEFAULT true,
    "fx_rates_json" JSONB, -- Store exchange rates
    "gst_enabled" BOOLEAN DEFAULT false,
    "tds_enabled" BOOLEAN DEFAULT false,
    "einvoicing_enabled" BOOLEAN DEFAULT false,
    "compliance_json" JSONB, -- GST, TDS, tax liabilities data
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "localization_settings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "user_preferences_userId_idx" ON "user_preferences"("userId");
CREATE INDEX IF NOT EXISTS "org_details_orgId_idx" ON "org_details"("orgId");
CREATE INDEX IF NOT EXISTS "localization_settings_orgId_idx" ON "localization_settings"("orgId");


