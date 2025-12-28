-- CreateTable: UserPreferences
CREATE TABLE IF NOT EXISTS "user_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "appearanceJson" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OrgDetails
CREATE TABLE IF NOT EXISTS "org_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "industry" TEXT,
    "companySize" TEXT,
    "website" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LocalizationSettings
CREATE TABLE IF NOT EXISTS "localization_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "displayCurrency" TEXT NOT NULL DEFAULT 'USD',
    "language" TEXT NOT NULL DEFAULT 'en',
    "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "numberFormat" TEXT NOT NULL DEFAULT '1,234.56',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "autoFxUpdate" BOOLEAN NOT NULL DEFAULT true,
    "fxRatesJson" JSONB,
    "gstEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tdsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "einvoicingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "complianceJson" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "localization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_userId_key" ON "user_preferences"("userId");
CREATE INDEX IF NOT EXISTS "user_preferences_userId_idx" ON "user_preferences"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "org_details_orgId_key" ON "org_details"("orgId");
CREATE INDEX IF NOT EXISTS "org_details_orgId_idx" ON "org_details"("orgId");
CREATE UNIQUE INDEX IF NOT EXISTS "localization_settings_orgId_key" ON "localization_settings"("orgId");
CREATE INDEX IF NOT EXISTS "localization_settings_orgId_idx" ON "localization_settings"("orgId");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_details" ADD CONSTRAINT "org_details_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "localization_settings" ADD CONSTRAINT "localization_settings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

