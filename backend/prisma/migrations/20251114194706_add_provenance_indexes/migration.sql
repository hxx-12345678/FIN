-- CreateIndex
CREATE INDEX "provenance_entries_orgId_idx" ON "provenance_entries"("orgId");

-- CreateIndex (GIN index for JSONB source_ref field for efficient search)
CREATE INDEX "provenance_entries_source_ref_idx" ON "provenance_entries" USING GIN ("source_ref");
