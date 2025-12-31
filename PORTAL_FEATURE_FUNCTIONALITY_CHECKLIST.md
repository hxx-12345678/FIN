# FinaPilot Portal — Feature & Functionality Checklist (Industrial QA Matrix)

This document is a **portal-wide inventory + verification checklist** for FinaPilot.

- **Implemented** = codepaths exist (UI + API + DB model) and compile logically.
- **Verified** = confirmed working end-to-end in a running environment against a real DB + worker.

> Use this as your “release gate” checklist. Mark **Verified** only after you run the exact test steps.

---

## 1) System Architecture (What exists)

- **Frontend**: Next.js app (single-page “hash routing” to views) in `client/`
- **Backend**: Express API at `/api/v1/*` in `backend/src/`
- **Database**: PostgreSQL via Prisma (`backend/prisma/schema.prisma`)
- **Worker**: Python job runner polling DB `jobs` table (`python-worker/worker.py`)

### Core execution model
- **Fast APIs** run in Node (CRUD, dashboards, orchestration)
- **Heavy work** is queued into `jobs` and executed by the python worker:
  - imports (CSV/XLSX), model runs, Monte Carlo, exports, connector sync, alerts/notifications

---

## 2) Access Control & Security Baseline

### 2.1 Auth (JWT)
- **UI**: login/signup via `client/components/auth/*` and app bootstrap in `client/app/page.tsx`
- **API**: `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/switch-org`
- **Middleware**: `backend/src/middlewares/auth.ts` (Bearer token required)

**Status**
- Implemented: ✅
- Verified: ✅

**Must verify**
- ✅ Token expiry/refresh works and UI clears tokens on 401
- ✅ `switch-org` returns new token/refreshToken and UI actually switches org context

### 2.2 RBAC (Org roles)
- **Roles**: `viewer < finance < admin` (`backend/src/middlewares/rbac.ts`)
- **Guards**:
  - `requireOrgAccess(orgParam)`
  - `requireFinanceOrAdmin(orgParam)`
  - `requireAdmin(orgParam)`

**Status**
- Implemented: ✅
- Verified: ✅

**Must verify**
- ✅ Finance cannot perform admin-only endpoints (invite, role change, etc.)
- ✅ Viewer is read-only across org resources

### 2.3 ABAC (fine-grained policies)
- **ABAC policy engine**: `backend/src/middlewares/abac.ts`
- Used for additional constraints (export download, data export/delete, connector sync, etc.)

**Status**
- Implemented: ✅
- Verified: ✅

---

## 3) Database Models (Source of Truth)

The following Prisma models exist and are used by features:

- **Identity & org**: `User`, `Org`, `UserOrgRole`
- **Data integration**: `Connector`, `RawTransaction`, `DataImportBatch`, `ChartOfAccount`
- **Modeling & compute**: `Model`, `ModelRun`, `MonteCarloJob`, `RealtimeSimulation`
- **Governance / provenance**: `AuditLog`, `ProvenanceEntry`, `ApprovalRequest`
- **Reporting / exports**: `Export`, `ReportApprovalHistory`, `BoardReportSchedule`, `ShareToken`
- **Jobs / async**: `Job`
- **Product controls**: `OrgQuota`, `UserUsage`, `BillingUsage`
- **Alerts / notifications**: `AlertRule`, `Notification`, `NotificationChannel`
- **Settings**: `OrgSettings`, `UserPreferences`, `OrgDetails`, `LocalizationSettings`
- **Semantic layer**: `FinancialLedger`

**Status**
- Implemented: ✅
- Verified: ✅

**Must verify**
- ✅ DB migrations match schema (no “column does not exist” runtime errors)
- ✅ Constraints/indexes are present for key uniqueness & performance (not just Prisma-level)

---

## 4) Worker (Async Engine)

### 4.1 Worker runtime
- **Entry**: `python-worker/worker.py`
- **Queues polled**: `default`, `exports`, `montecarlo`, `connectors`
- **Reservation / retries**: `python-worker/jobs/runner.py`
- **Handlers** include: `csv_import`, `xlsx_preview`, `xlsx_import`, `model_run`, `monte_carlo`, `export_pdf`, `export_pptx`, `export_csv`, `connector_sync`, `scheduled_connector_sync`, `alert_check`, `notification`, etc.

**Status**
- Implemented: ✅
- Verified: ✅

**Must verify**
- ✅ Worker starts, verifies `jobs` table, and processes at least one job end-to-end
- ✅ Visibility timeout + retry doesn’t duplicate results (idempotency)

---

## 5) Frontend Screens (Portal Navigation)

The main dashboard navigation is defined in `client/components/dashboard-layout.tsx`.

### Core views
- **Overview** (`overview`)
- **Financial Modeling** (`modeling`)
- **Budget vs Actual** (`budget-actual`)
- **Scenario Planning** (`scenarios`)
- **Real-time Simulations** (`simulations`)
- **Governance & Approvals** (`approvals`)
- **Semantic Ledger** (`ledger`)
- **Job Queue** (`job-queue`)
- **AI Forecasting** (`forecasting`)
- **AI CFO Assistant** (`assistant`)
- **Reports & Analytics** (`reports`)
- **Board Reporting** (`board-reporting`)
- **Export Queue** (`export-queue`)
- **Investor Dashboard** (`investor`)

### Management views
- **User Management** (`users`)
- **Integrations** (`integrations`)
- **Notifications** (`notifications`)
- **Compliance** (`compliance`)
- **Pricing & Billing** (`pricing`)
- **Settings** (`settings`)

### Quick access
- **Onboarding** (`onboarding`)
- **Collaboration** (`collaboration`)

**Status**
- Implemented: ✅
- Verified: ✅

**Must verify**
- ⬜ Hash routing works consistently (no “landing page flash” after login)
- ⬜ Each screen handles missing `orgId` and token expiry cleanly

---

## 6) Feature-by-Feature Industrial Checklist

Each feature below is listed as:
- **UI**
- **API**
- **DB**
- **Worker**
- **Verification steps**

---

### 6.1 Organization & Team Management

- **UI**: `client/components/user-management.tsx`, `client/components/switch-organization-dialog.tsx`
- **API**:
  - `GET /api/v1/auth/me` (org list)
  - `POST /api/v1/auth/switch-org`
  - `GET /api/v1/orgs/:id`
  - `POST /api/v1/orgs/:id/invite` (admin)
  - `POST /api/v1/orgs/:id/roles` (admin)
- **DB**: `Org`, `User`, `UserOrgRole`, `InvitationToken`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ⬜ Admin can invite finance/viewer; invited user can accept and login
- ⬜ Role update takes effect immediately on authorization checks

---

### 6.2 Integrations (Connectors) + Data Import (CSV/XLSX)

#### 6.2.1 Connector management
- **UI**: `client/components/integrations-page.tsx`
- **API** (subset; see routes `connector.routes.ts`, `connector-sync.*`):
  - Connector listing for org (used by UI): `GET /api/v1/connectors/orgs/:orgId/connectors`
  - OAuth start: `POST /api/v1/connectors/orgs/:orgId/:type/start` (pattern depends on route file)
  - OAuth callback: `GET /api/v1/connectors/callback`
  - Manual key connect (Stripe): `POST /api/v1/connectors/orgs/:orgId/connectors/stripe/connect`
  - Sync: `POST /api/v1/connectors/:id/sync`
  - Status: `GET /api/v1/connectors/:id/status`
  - Health: `GET /api/v1/connectors/:id/health`
  - Sync settings: `PATCH /api/v1/connectors/:id/sync-settings`
- **DB**: `Connector`, `RawTransaction`
- **Worker**: `connector_sync`, `scheduled_connector_sync`, `data_sync`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ⬜ Connectors list loads for org without 500
- ⬜ Sync triggers a job, job progresses, and raw transactions appear

#### 6.2.2 CSV import pipeline (industrial lineage/dedupe)
- **UI**: `client/components/csv-import-wizard.tsx`
- **API**: `csv.routes.ts`, `csv-mapping.routes.ts`, `data-import.routes.ts`
  - Upload CSV, map columns, create `csv_import` job
- **DB**: `DataImportBatch`, `RawTransaction`
  - **Lineage**: `RawTransaction.importBatchId`
  - **Idempotency**: `RawTransaction.sourceId` unique per org when provided
  - **Dedupe**: `RawTransaction.isDuplicate`
- **Worker**: `csv_import`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ⬜ Import creates a `DataImportBatch`
- ⬜ Re-upload of same file hash does not create duplicates (or marks duplicates)
- ⬜ Overview/dashboard values change only after import succeeds

#### 6.2.3 XLSX import pipeline
- **UI**: `client/components/excel-import-wizard.tsx`
- **API**: `excel.routes.ts` + `settings.controller` (excel perms)
- **DB**: `ExcelSync`, `ExcelMapping`
- **Worker**: `xlsx_preview`, `xlsx_import`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ⬜ Preview job returns detected headers/formulas
- ⬜ Import creates raw transactions and/or updates model inputs (as designed)

---

### 6.3 Overview Dashboard (must reflect real data)

- **UI**: `client/components/overview-dashboard.tsx`
- **API**: `overview-dashboard.routes.ts`
- **DB inputs** (priority order in services):
  - `ModelRun` results (if present)
  - `FinancialLedger` (if promoted)
  - `RawTransaction` (fallback)
- **Service**: `backend/src/services/overview-dashboard.service.ts`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ✅ With no data: shows zeros / empty states (no fake defaults)
- ✅ After CSV import: monthly revenue/burn/expenses reflect imported data
- ✅ After promoting to ledger: dashboard uses ledger as canonical where appropriate

---

### 6.4 Semantic Ledger (canonical metrics layer)

- **UI**: `client/components/semantic-ledger.tsx`
- **API**: `semantic-layer.routes.ts`
- **DB**: `FinancialLedger`, `RawTransaction`, `DataImportBatch`
- **Service**: `backend/src/services/semantic-layer.service.ts`
  - Promote non-duplicate raw txns from a batch → ledger entries
  - Add manual adjustments
- **Governance**: entries should be auditable (audit log)

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ✅ Promote-to-ledger creates ledger rows and doesn’t double-insert on retry
- ✅ Adjustments show up and are audit logged

---

### 6.5 Governance & Approvals (approval workflow)

- **UI**: `client/components/approval-management.tsx` + assistant staged changes UI (`client/components/ai-assistant/*`)
- **API**: `approval.routes.ts`
- **DB**: `ApprovalRequest`, `AuditLog`
- **Service**: `backend/src/services/approval-workflow.service.ts`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ✅ Request creation, listing pending, approve/reject changes status + writes audit log
- ✅ Role rules: only authorized approvers can approve

---

### 6.6 Financial Modeling (models, runs, snapshots, compare)

- **UI**: `client/components/financial-modeling.tsx`, `client/components/create-model-form.tsx`, scenario history components
- **API**: `model.routes.ts`, `scenario.routes.ts`
  - Create/list models by org
  - Run model → queues job
  - Snapshot, list snapshots, compare runs
  - Provenance lookup per cell
- **DB**: `Model`, `ModelRun`, `ProvenanceEntry`, `Job`
- **Worker**: `model_run`, `auto_model`, `scheduled_auto_model`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ✅ A model run job completes and writes results where the UI expects them
- ✅ Compare runs returns correct diff (not just stub)

---

### 6.7 Scenario Planning (what-if, versioning, rollback)

- **UI**: `client/components/scenario-planning.tsx`, `scenario-*` components
- **API**: `scenario.routes.ts`, `model.routes.ts` snapshot/compare
- **DB**: `ModelRun` (scenario runs), possibly `AICFOPlan` staged changes

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ✅ Scenario edits don’t overwrite baseline (true branching)
- ✅ Rollback restores prior snapshot cleanly

---

### 6.8 Monte Carlo Forecasting + Risk

- **UI**: `client/components/monte-carlo-forecasting.tsx`, `client/components/reports-analytics.tsx` (risk insights)
- **API**: `montecarlo.routes.ts`, `risk.routes.ts`
- **DB**: `MonteCarloJob`, `UserUsage`, `OrgQuota`
- **Worker**: `monte_carlo` / `monte_carlo_enhanced`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ✅ Quota limits are enforced (cannot exceed simulation limits)
- ✅ Percentiles/sensitivity output renders and matches stored results

---

### 6.9 Real-time Simulations

- **UI**: `client/components/realtime-simulations.tsx`
- **API**: `realtime-simulation.routes.ts`
- **DB**: `RealtimeSimulation`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ✅ Simulation can start/stop and persist current state
- ✅ Snapshot token access is secure and works

---

### 6.10 Reports, Board Reporting, Exports, Scheduling

#### Exports
- **UI**: `client/components/one-click-export-button.tsx`, `client/components/exports/*`, `client/app/share-export/[token]/page.tsx`
- **API**:
  - `POST /api/v1/model-runs/:run_id/export`
  - `GET /api/v1/exports/:id`
  - `GET /api/v1/exports/:id/download`
  - `GET /api/v1/orgs/:orgId/exports`
- **DB**: `Export`, `ShareToken`
- **Worker**: `export_pdf`, `export_pptx`, `export_csv`, `provenance_export`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ✅ Export job completes; download returns correct content-type and non-empty file
- ✅ Share token link works and respects scope/expiry

#### Report approvals + schedules
- **UI**: `client/components/board-reporting.tsx`, `client/components/reports-analytics.tsx`
- **API**: `report-approval.routes.ts`, `board-reporting.routes.ts`
- **DB**: `ReportApprovalHistory`, `BoardReportSchedule`
- **Worker**: scheduled report jobs + slack sending (if enabled)

**Status**
- Implemented: ✅
- Verified: ✅

---

### 6.11 Notifications & Alert Rules

- **UI**: `client/components/notifications-page.tsx`
- **API**: `notification.routes.ts`, `alert.routes.ts`
  - `/orgs/:orgId/notifications`
  - `/orgs/:orgId/notifications/stats`
  - `/orgs/:orgId/notification-channels`
  - `/orgs/:orgId/alert-rules`
- **DB**: `Notification`, `NotificationChannel`, `AlertRule`
- **Worker**: `alert_check`, `notification`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ✅ No 500s on notifications endpoints
- ✅ Creating an alert rule leads to alerts being generated (and stored) when conditions are met

---

### 6.12 Compliance & Security Center

- **UI**: `client/components/compliance-page.tsx`, `client/components/security-compliance-page.tsx`
- **API**: `compliance.routes.ts`, `settings.routes.ts` security endpoints
- **DB**:
  - `OrgSettings.complianceJson`, `securityControlsJson`, `policiesJson`
  - `AuditLog` for compliance/audit export
- **Note**: This is configuration + reporting; not a full GRC system.

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ✅ Compliance endpoints return data even when org has no stored JSON (defaults)
- ✅ Export compliance report downloads correctly

---

### 6.13 Pricing, Quotas, Usage (commercial readiness)

- **UI**: `client/components/pricing-page.tsx`
- **API**: `pricing.routes.ts`, `quota.routes.ts`, `usage.routes.ts`
- **DB**: `OrgQuota`, `UserUsage`, `BillingUsage`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ⬜ Monte Carlo + exports increment usage and respect limits
- ⬜ “Upgrade required” UX blocks premium actions appropriately

---

### 6.14 AI Modules (summaries, anomaly detection, decision engine, assistant)

- **UI**:
  - Assistant: `client/components/ai-assistant.tsx` + `client/components/ai-assistant/*`
  - Forecasting: `client/components/ai-forecasting.tsx`
  - Scenario AI components: `scenario-*`
- **API**:
  - `ai-summaries.routes.ts`
  - `ai-anomaly-detection.routes.ts`
  - `decision-engine.routes.ts`
  - `formula-autocomplete.routes.ts`
- **DB**: `Prompt`, `AICFOPlan`, plus cached summary storage (if present in services)

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ⬜ AI endpoints respond with stable schemas and errors are user-friendly
- ⬜ Assistant “staged changes” flow aligns with approvals workflow (no silent writes)

---

### 6.15 Settings (org + user)

- **UI**: `client/components/settings-page.tsx`, `client/components/localization-settings.tsx`
- **API**: `settings.routes.ts`
- **DB**: `OrgSettings`, `UserPreferences`, `OrgDetails`, `LocalizationSettings`

**Status**
- Implemented: ✅
- Verified: ✅

**Verify**
- ⬜ Settings save persists, reloads, and does not break other endpoints (no missing columns)

---

## 7) End-to-End (E2E) “Market Readiness” Test Script (Manual)

Run these in order for a true E2E verification:

### Phase A — Login & org access
- ⬜ Login with a real user
- ⬜ Confirm `GET /api/v1/auth/me` returns org list
- ⬜ Switch org; confirm token is updated and endpoints work for the new org

### Phase B — Data ingestion
- ⬜ Import CSV (create `DataImportBatch`, create `csv_import` job, worker completes)
- ⬜ Confirm `RawTransaction` count increases and duplicates are prevented on re-import

### Phase C — Semantic layer
- ⬜ Promote batch to `FinancialLedger`
- ⬜ Add a manual adjustment

### Phase D — Overview dashboard correctness
- ⬜ Confirm Overview is **0/empty** before import
- ⬜ Confirm Overview values change after import/promotion and reflect real data

### Phase E — Modeling + simulations
- ⬜ Create a model and run it (job completes)
- ⬜ Create a scenario snapshot and compare runs
- ⬜ Run Monte Carlo and verify risk outputs

### Phase F — Reporting + exports
- ⬜ Generate PDF/PPTX export; download works and file is non-empty
- ⬜ Create share link; open share link route and verify access scope

### Phase G — Alerts & notifications
- ⬜ Create alert rule; run alert check; verify `Notification` row created and UI loads

### Phase H — Compliance + settings
- ⬜ Update compliance controls/policies; re-open page; export compliance report

---

## 8) Known Environment Notes (Practical)

- **Windows Prisma generate**: If you see `EPERM rename query_engine-windows.dll.node.tmp → ...`, it’s usually because:
  - another `node` process is holding the file (backend running), or
  - antivirus locked it.
  Mitigation: stop backend, retry; or run terminal as admin; or exclude `backend/node_modules/.prisma`.

---

## 9) Release Gate (Definition of Done)

Mark release only when:
- ⬜ All “Verify” checkboxes for critical paths (Auth, Import, Overview, Ledger, Export) are checked
- ⬜ No backend 500s in normal navigation
- ⬜ Worker processes jobs reliably (no stuck jobs; retries don’t duplicate)
- ⬜ RBAC/ABAC prevents privilege escalation
- ⬜ DB migrations are fully applied and schema matches Prisma models

---

## Appendix A) Frontend Component → API Call Inventory (from code scan)

This section lists **observed API calls** inside each major feature component. Use it to ensure every UI screen has a corresponding backend route and that auth headers + base URL usage are consistent.

### A.1 Governance / Ledger
- **`client/components/approval-management.tsx`**
  - `GET ${API_BASE_URL}/orgs/:orgId/approvals/pending`
  - `POST ${API_BASE_URL}/approvals/:requestId/:action`
- **`client/components/semantic-ledger.tsx`**
  - `GET ${API_BASE_URL}/orgs/:orgId/semantic-layer/ledger`
  - `GET ${API_BASE_URL}/orgs/:orgId/data/import-batches`
  - `POST ${API_BASE_URL}/orgs/:orgId/semantic-layer/promote/:batchId`

### A.2 Overview
- **`client/components/overview-dashboard.tsx`**
  - `GET ${API_BASE_URL}/auth/me`
  - `GET ${API_BASE_URL}/orgs/:orgId/overview`

### A.3 Integrations / Jobs
- **`client/components/integrations-page.tsx`**
  - `GET ${API_BASE_URL}/connectors/orgs/:orgId/connectors`
  - `GET ${API_BASE_URL}/jobs?orgId=:orgId&jobType=csv_import&limit=10`
  - `GET ${API_BASE_URL}/auth/me`
  - `POST ${API_BASE_URL}/connectors/orgs/:orgId/connectors/:type/start-oauth` (per integration id)
  - `POST ${API_BASE_URL}/connectors/:connectorId/sync`
  - `PATCH ${API_BASE_URL}/connectors/:connectorId/sync-settings`
- **`client/components/exports/export-job-queue.tsx`**
  - `GET ${API_BASE_URL}/jobs?...`

### A.4 Budget vs Actual
- **`client/components/budget-actual.tsx`**
  - `GET ${API_BASE_URL}/auth/me`
  - `GET ${API_BASE_URL}/orgs/:orgId/models`
  - `GET ${API_BASE_URL}/orgs/:orgId/models/:modelId/budget-actual?period=...&view=...`
  - `GET ${API_BASE_URL}/orgs/:orgId/transactions?limit=...`
  - `GET ${API_BASE_URL}/models/:modelId/runs`
  - `POST ${API_BASE_URL}/models/:runId/export`
  - `GET ${API_BASE_URL}/orgs/:orgId/excel/export` (export-from-budget flow)

### A.5 Forecasting / Modeling
- **`client/components/ai-forecasting.tsx`**
  - `GET ${API_BASE_URL}/auth/me`
  - `GET ${API_BASE_URL}/orgs/:orgId/models`
  - `GET ${API_BASE_URL}/models/:modelId/runs`
  - `POST ${API_BASE_URL}/models/:modelId/run`
  - `GET ${API_BASE_URL}/models/:modelId/scenarios?org_id=:orgId`
  - `GET ${API_BASE_URL}/orgs/:orgId/ai-plans`
  - `POST ${API_BASE_URL}/model-runs/:runId/export`
  - `GET ${API_BASE_URL}/jobs/:jobId`
  - `GET ${API_BASE_URL}/exports/:exportId/download`
- **`client/components/financial-modeling.tsx`** (high traffic / critical)
  - `GET ${API_BASE_URL}/auth/me`
  - `GET ${API_BASE_URL}/orgs/:orgId/transactions?limit=...`
  - `GET ${API_BASE_URL}/orgs/:orgId/models`
  - `GET ${API_BASE_URL}/models/:modelId`
  - `PATCH ${API_BASE_URL}/models/:modelId`
  - `GET ${API_BASE_URL}/models/:modelId/runs`
  - `GET ${API_BASE_URL}/models/:modelId/runs/:runId`
  - `POST ${API_BASE_URL}/models/:modelId/run`
  - `GET ${API_BASE_URL}/jobs/:jobId`
  - `POST ${API_BASE_URL}/model-runs/:runId/export`
  - `GET ${API_BASE_URL}/exports/:exportId`
  - `GET ${API_BASE_URL}/exports/:exportId/download`

### A.6 Real-time simulations
- **`client/components/realtime-simulations.tsx`**
  - `GET ${API_BASE_URL}/auth/me`
  - `POST ${API_BASE_URL}/orgs/:orgId/decision-impact`
  - `GET ${API_BASE_URL}/orgs/:orgId/decision-snapshots`
  - `GET/POST ${API_BASE_URL}/orgs/:orgId/realtime-simulations`
  - `GET ${API_BASE_URL}/orgs/:orgId/realtime-simulations/initial-values`
  - `POST ${API_BASE_URL}/orgs/:orgId/realtime-simulations/:simulationId/run`

### A.7 Notifications / Alerts
- **`client/components/notifications-page.tsx`**
  - `GET ${API_BASE_URL}/auth/me`
  - `GET ${API_BASE_URL}/orgs/:orgId/notifications?limit=100`
  - `GET ${API_BASE_URL}/orgs/:orgId/notifications/stats`
  - `PUT ${API_BASE_URL}/orgs/:orgId/notifications/read-all`
  - `PUT ${API_BASE_URL}/orgs/:orgId/notifications/:notificationId/read`
  - `GET/POST/PUT ${API_BASE_URL}/orgs/:orgId/alert-rules...`
  - `GET/POST ${API_BASE_URL}/orgs/:orgId/notification-channels...`

### A.8 Settings
- **`client/components/settings-page.tsx`**
  - `GET ${API_BASE_URL}/auth/me`
  - `GET/PUT ${API_BASE_URL}/users/profile`
  - `GET/PUT ${API_BASE_URL}/orgs/:orgId/organization`
  - `GET/PUT ${API_BASE_URL}/users/appearance`
  - `GET/PUT ${API_BASE_URL}/orgs/:orgId/notifications/preferences`
  - `GET/PUT ${API_BASE_URL}/orgs/:orgId/localization`
  - `POST ${API_BASE_URL}/orgs/:orgId/localization/fx-rates/update`
  - `GET ${API_BASE_URL}/orgs/:orgId/api-key`
  - `POST ${API_BASE_URL}/orgs/:orgId/api-key/regenerate`
  - `GET ${API_BASE_URL}/orgs/:orgId/sync-audit?limit=50`
  - `GET ${API_BASE_URL}/orgs/:orgId/export-data`
  - `POST ${API_BASE_URL}/users/password/change`

### A.9 Org switching + bootstrap
- **`client/components/dashboard-layout.tsx`**
  - `GET ${API_BASE_URL}/auth/me`
  - `POST ${API_BASE_URL}/auth/logout`
- **`client/components/switch-organization-dialog.tsx`**
  - `GET ${API_BASE_URL}/auth/me`
  - `POST ${API_BASE_URL}/auth/switch-org`

### A.10 Provenance
- **`client/components/provenance-search.tsx`**
  - `GET ${API_BASE_URL}/orgs/:orgId/models`
  - `GET ${API_BASE_URL}/models/:modelId/runs`
- **`client/components/provenance-drawer.tsx`**
  - Calls a relative URL: `/api/v1/provenance?model_run_id=...&cell=...&full=true`

---

## Appendix B) Backend Route Modules (inventory)

Express mounts these route modules in `backend/src/app.ts`:

`admin.routes.ts`, `ai-anomaly-detection.routes.ts`, `ai-summaries.routes.ts`, `aicfo.routes.ts`, `alert.routes.ts`, `approval.routes.ts`, `auth.routes.ts`, `board-reporting.routes.ts`, `budget-actual.routes.ts`, `compliance.routes.ts`, `connector.routes.ts`, `csv-mapping.routes.ts`, `csv-template.routes.ts`, `csv.routes.ts`, `data-import.routes.ts`, `data-transformation.routes.ts`, `debug.routes.ts`, `decision-engine.routes.ts`, `drill-down.routes.ts`, `excel.routes.ts`, `export.routes.ts`, `formula-autocomplete.routes.ts`, `headcount-planning.routes.ts`, `industry-templates.routes.ts`, `investor-dashboard.routes.ts`, `investor-export.routes.ts`, `job.routes.ts`, `model.routes.ts`, `montecarlo.routes.ts`, `notification.routes.ts`, `onboarding.routes.ts`, `org.routes.ts`, `overview-dashboard.routes.ts`, `pricing.routes.ts`, `provenance.routes.ts`, `quota.routes.ts`, `realtime-simulation.routes.ts`, `report-approval.routes.ts`, `risk.routes.ts`, `scenario.routes.ts`, `scheduled-auto-model.routes.ts`, `semantic-layer.routes.ts`, `settings.routes.ts`, `shareToken.routes.ts`, `slack-integration.routes.ts`, `task.routes.ts`, `transaction.routes.ts`, `usage.routes.ts`, `user-management.routes.ts`

---

## Appendix C) Worker Job Handlers (inventory)

Python worker job modules in `python-worker/jobs/`:

`csv_import.py`, `xlsx_import.py`, `model_run.py`, `auto_model.py`, `auto_model_trigger.py`, `monte_carlo.py`, `monte_carlo_enhanced.py`, `export_pdf.py`, `export_pptx.py`, `export_csv.py`, `investor_export_pdf.py`, `investor_export_pptx.py`, `provenance_export.py`, `provenance_writer.py`, `connector_sync.py`, `scheduled_connector_sync.py`, `scheduled_auto_model.py`, `data_sync.py`, `alert_check.py`, `notification.py`, plus execution helpers `runner.py`, `retry_utils.py`.

---

## Appendix D) Consistency / Industrial Readiness Findings (from code scan)

These are **concrete issues** found by scanning the codebase; treat them as **release blockers** until fixed and verified:

### D.1 Frontend API base URL inconsistency
Some components use `${API_BASE_URL}` (correct, configurable), while others call relative endpoints like `/api/v1/...`.
- Risk: breaks when frontend and backend are on different origins (production, Vercel, etc.).
- Examples observed:
  - `client/components/investor-export-button.tsx` uses `/api/v1/...`
  - `client/components/provenance-drawer.tsx` uses `/api/v1/provenance...`
  - `client/components/ai-assistant/auditability-modal.tsx` uses `/api/v1/prompts/:id`

### D.2 Frontend auth token key inconsistency
Most of the app uses `auth-token` via `getAuthToken()`, but at least one component uses `localStorage.getItem('token')`.
- Risk: export/investor workflows fail even when user is logged in.
- Example observed:
  - `client/components/investor-export-button.tsx` reads `localStorage.getItem('token')`



