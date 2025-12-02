-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budgets_org_id_category_month_key" ON "budgets"("org_id", "category", "month");

-- CreateIndex
CREATE INDEX "budgets_org_id_idx" ON "budgets"("org_id");

-- CreateIndex
CREATE INDEX "budgets_org_id_month_idx" ON "budgets"("org_id", "month");

-- CreateIndex
CREATE INDEX "budgets_category_idx" ON "budgets"("category");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

