-- CreateTable
CREATE TABLE "ai_cfo_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_cfo_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_cfo_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "agentType" TEXT,
    "confidence" DECIMAL(5,4),
    "thoughts" JSONB,
    "dataSources" JSONB,
    "recommendations" JSONB,
    "calculations" JSONB,
    "visualizations" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_cfo_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "headcount_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'General',
    "role" TEXT NOT NULL,
    "level" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "salary" DECIMAL(20,4),
    "benefits_multiplier" DECIMAL(5,2) DEFAULT 1.3,
    "total_annual_cost" DECIMAL(20,4),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "ramp_months" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "hiring_stage" TEXT DEFAULT 'open',
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "headcount_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidation_entities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "entity_type" TEXT NOT NULL DEFAULT 'subsidiary',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "ownership_pct" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "country" TEXT,
    "tax_rate" DECIMAL(5,4),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "financial_data" JSONB,
    "intercompany_map" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consolidation_entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_cfo_conversations_orgId_idx" ON "ai_cfo_conversations"("orgId");

-- CreateIndex
CREATE INDEX "ai_cfo_conversations_userId_idx" ON "ai_cfo_conversations"("userId");

-- CreateIndex
CREATE INDEX "ai_cfo_messages_conversationId_idx" ON "ai_cfo_messages"("conversationId");

-- CreateIndex
CREATE INDEX "headcount_plans_org_id_idx" ON "headcount_plans"("org_id");

-- CreateIndex
CREATE INDEX "headcount_plans_department_idx" ON "headcount_plans"("department");

-- CreateIndex
CREATE INDEX "headcount_plans_status_idx" ON "headcount_plans"("status");

-- CreateIndex
CREATE INDEX "headcount_plans_org_id_department_idx" ON "headcount_plans"("org_id", "department");

-- CreateIndex
CREATE INDEX "consolidation_entities_org_id_idx" ON "consolidation_entities"("org_id");

-- CreateIndex
CREATE INDEX "consolidation_entities_entity_type_idx" ON "consolidation_entities"("entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "consolidation_entities_org_id_code_key" ON "consolidation_entities"("org_id", "code");

-- AddForeignKey
ALTER TABLE "ai_cfo_conversations" ADD CONSTRAINT "ai_cfo_conversations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_cfo_conversations" ADD CONSTRAINT "ai_cfo_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_cfo_messages" ADD CONSTRAINT "ai_cfo_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_cfo_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "headcount_plans" ADD CONSTRAINT "headcount_plans_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_entities" ADD CONSTRAINT "consolidation_entities_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
