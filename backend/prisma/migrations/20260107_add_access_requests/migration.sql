-- CreateTable
CREATE TABLE "access_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "message" TEXT,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_requests_org_id_idx" ON "access_requests"("org_id");

-- CreateIndex
CREATE INDEX "access_requests_email_idx" ON "access_requests"("email");

-- CreateIndex
CREATE INDEX "access_requests_domain_idx" ON "access_requests"("domain");

-- CreateIndex
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");

-- CreateIndex
CREATE INDEX "access_requests_org_id_status_idx" ON "access_requests"("org_id", "status");

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

