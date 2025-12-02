# FinaPilot - AI-CFO & FP&A Platform

Complete financial modeling and forecasting platform with AI-powered insights.

## 🏗️ Architecture

Three-layer architecture:

```
├── client/          # Frontend (Next.js) - Port 3000
├── backend/         # Backend API (Node.js) - Port 5000
└── python-worker/   # Python Worker - Heavy compute tasks
```

## 📁 Repository Structure

### `client/` - Frontend
- Next.js 14 application
- 96% feature complete
- All UI components implemented

### `backend/` - Backend API
- Node.js + Express + TypeScript
- Prisma ORM with PostgreSQL
- REST API with authentication & RBAC
- Job creation (not execution)

**Key Folders:**
- `src/controllers/` - 10 API controllers
- `src/services/` - Business logic
- `src/repositories/` - Data access
- `src/middlewares/` - Auth, RBAC, error handling
- `src/routes/` - API routes
- `src/utils/` - Utilities (JWT, S3, etc.)
- `prisma/` - Database schema (17 tables)

### `python-worker/` - Python Worker
- Polls `jobs` table every 2 seconds
- Executes heavy compute tasks:
  - CSV import parsing
  - Model run computation
  - Monte Carlo simulations
  - PDF/PPTX/CSV export generation

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and credentials
npm run prisma:generate
npx prisma migrate deploy
npm run dev
```

### 2. Python Worker Setup

```bash
cd python-worker
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your DATABASE_URL and AWS credentials
python worker.py
```

### 3. Frontend Setup

```bash
cd client
cp .env.local.example .env.local
# Edit .env.local: NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
npm install
npm run dev
```

## 📊 Database

17 tables in PostgreSQL:
- users, orgs, user_org_roles
- connectors, raw_transactions, chart_of_accounts
- models, model_runs, monte_carlo_jobs
- prompts, provenance_entries
- exports, jobs, audit_logs
- invitation_tokens, share_tokens, billing_usage

## 🔌 API Endpoints

All endpoints under `/api/v1/`:
- Auth: signup, login, refresh, me
- Orgs: get, invite, roles
- Connectors: OAuth, sync, status
- CSV: import (returns job_id)
- Models: CRUD, runs
- Monte Carlo: create job, get results
- Provenance: query by model_run_id & cell_key
- Exports: create export, get with signed URL
- Jobs: get status
- Debug: create demo

## 📝 Environment Variables

### Backend (`.env`)
```env
DATABASE_URL=postgresql://...
PORT=5000
JWT_SECRET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...
```

### Python Worker (`.env`)
```env
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=...
```

### Client (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

## 🎯 Features

- ✅ Authentication & RBAC
- ✅ Organization management
- ✅ Connector integrations (OAuth flows)
- ✅ CSV import with auto-mapping
- ✅ Financial model creation & runs
- ✅ Monte Carlo simulations
- ✅ Provenance tracking
- ✅ PDF/PPTX/CSV exports
- ✅ Job queue system

## 📚 Documentation

- `backend/README.md` - Backend API documentation
- `python-worker/README.md` - Python worker documentation

## 🔧 Development

- Backend: `cd backend && npm run dev`
- Python Worker: `cd python-worker && python worker.py`
- Frontend: `cd client && npm run dev`

## 📄 License

ISC

