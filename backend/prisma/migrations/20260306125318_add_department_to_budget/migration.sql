/*
  Warnings:

  - A unique constraint covering the columns `[org_id,category,department,month]` on the table `budgets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "budgets_org_id_category_month_key";

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "department" TEXT DEFAULT 'General';

-- CreateIndex
CREATE INDEX "budgets_department_idx" ON "budgets"("department");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_org_id_category_department_month_key" ON "budgets"("org_id", "category", "department", "month");
