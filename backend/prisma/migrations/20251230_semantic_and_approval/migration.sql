-- CreateTable: financial_ledger (Safe: uses IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "financial_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "transaction_date" DATE NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "account_code" TEXT,
    "account_name" TEXT,
    "category" TEXT,
    "description" TEXT,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT,
    "is_adjustment" BOOLEAN NOT NULL DEFAULT false,
    "adjustment_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "financial_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable: approval_requests (Safe: uses IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "approval_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "approverId" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL,
    "object_type" TEXT NOT NULL,
    "object_id" UUID NOT NULL,
    "payload_json" JSONB NOT NULL,
    "comment" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (Safe: uses IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "financial_ledger_orgId_idx" ON "financial_ledger"("orgId");
CREATE INDEX IF NOT EXISTS "financial_ledger_transaction_date_idx" ON "financial_ledger"("transaction_date");
CREATE INDEX IF NOT EXISTS "financial_ledger_account_code_idx" ON "financial_ledger"("account_code");

-- CreateIndex (Safe: uses IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "approval_requests_orgId_idx" ON "approval_requests"("orgId");
CREATE INDEX IF NOT EXISTS "approval_requests_status_idx" ON "approval_requests"("status");
CREATE INDEX IF NOT EXISTS "approval_requests_requesterId_idx" ON "approval_requests"("requesterId");

-- AddForeignKey (Safe: checks if constraint exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'financial_ledger_orgId_fkey'
    ) THEN
        ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_orgId_fkey" 
            FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'approval_requests_orgId_fkey'
    ) THEN
        ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_orgId_fkey" 
            FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'approval_requests_requesterId_fkey'
    ) THEN
        ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requesterId_fkey" 
            FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'approval_requests_approverId_fkey'
    ) THEN
        ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approverId_fkey" 
            FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;


