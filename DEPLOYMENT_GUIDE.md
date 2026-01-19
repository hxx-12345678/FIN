# FinaPilot Deployment Guide

Complete guide for deploying FinaPilot to production using Vercel (Frontend) and Render (Backend + Python Worker).

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Backend Deployment (Render)](#backend-deployment-render)
5. [Python Worker Deployment (Render)](#python-worker-deployment-render)
6. [Database Setup (Render PostgreSQL)](#database-setup-render-postgresql)
7. [Environment Variables](#environment-variables)
8. [Post-Deployment Steps](#post-deployment-steps)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│   Vercel (Frontend)                 │
│   - Next.js Application             │
│   - Static Assets                   │
│   - Serverless Functions            │
└──────────────┬──────────────────────┘
               │
               │ HTTPS
               │
┌──────────────▼──────────────────────┐
│   Render (Backend API)              │
│   - Node.js + Express               │
│   - Port: 8000                      │
│   - PostgreSQL Connection           │
└──────────────┬──────────────────────┘
               │
               │ Database
               │
┌──────────────▼──────────────────────┐
│   Render PostgreSQL                 │
│   - Main Database                   │
│   - Shared with Backend & Worker    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Render (Python Worker)            │
│   - Python 3.9+                     │
│   - Polls jobs table                │
│   - Executes heavy compute tasks    │
└─────────────────────────────────────┘
```

---

## 📦 Prerequisites

Before deploying, ensure you have:

1. **GitHub Account** - Repository must be on GitHub
2. **Vercel Account** - [vercel.com](https://vercel.com)
3. **Render Account** - [render.com](https://render.com)
4. **PostgreSQL Database** - Render PostgreSQL or external provider
5. **Environment Variables** - All required config values

---

## 🚀 Frontend Deployment (Vercel)

### Step 1: Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import your GitHub repository
4. Select the repository containing `client/` folder

### Step 2: Configure Project Settings

**Root Directory:**
- Set to `client` (not root of repo)

**Framework Preset:**
- Next.js (auto-detected)

**Build Command:**
```bash
npm run build
```

**Output Directory:**
```
.next
```

**Install Command:**
```bash
npm install
```

### Step 3: Environment Variables

Add these environment variables in Vercel Dashboard:

```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
NEXT_PUBLIC_ENVIRONMENT=production
```

**Important:**
- `NEXT_PUBLIC_API_URL` should point to your Render backend URL
- Use `https://` not `http://`
- Include `/api/v1` at the end

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Your frontend will be live at: `https://your-project.vercel.app`

### Step 5: Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

---

## ⚙️ Backend Deployment (Render)

### Step 1: Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository

### Step 2: Configure Service

**Name:** `finapilot-backend` (or your choice)

**Root Directory:**
- Set to `backend`

**Environment:**
- `Node`

**Build Command:**
```bash
npm install && npm run build && npx prisma migrate deploy
```

**Start Command:**
```bash
npm start
```

**Instance Type:**
- Starter ($7/month) for development
- Standard ($25/month) for production

### Step 3: Environment Variables

Add all environment variables (see [Environment Variables](#environment-variables) section below)

**Critical Variables:**
```
NODE_ENV=production
PORT=8000
DATABASE_URL=postgresql://user:pass@host:port/dbname
JWT_SECRET=your-secret-key-here
FRONTEND_URL=https://your-frontend.vercel.app
```

### Step 4: Health Check

**Health Check Path:**
```
/health
```

(You may need to add a `/health` endpoint if it doesn't exist)

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will build and deploy (5-10 minutes)
3. Your backend will be live at: `https://your-backend.onrender.com`

---

## 🐍 Python Worker Deployment (Render)

### Step 1: Create Background Worker

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Background Worker"**
3. Connect the same GitHub repository

### Step 2: Configure Worker

**Name:** `finapilot-python-worker`

**Root Directory:**
- Set to `python-worker`

**Environment:**
- `Python 3`

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
python worker.py
```

**Instance Type:**
- Starter ($7/month) for development
- Standard ($25/month) for production

### Step 3: Environment Variables

Add the same database and config variables as backend:

```
DATABASE_URL=postgresql://user:pass@host:port/dbname
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

### Step 4: Deploy

1. Click **"Create Background Worker"**
2. Render will deploy the worker
3. Worker starts polling jobs table automatically

---

## 💾 Database Setup (Render PostgreSQL)

### Option 1: Render PostgreSQL (Recommended)

1. Go to Render Dashboard
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name:** `finapilot-db`
   - **Database:** `finapilot`
   - **User:** Auto-generated
   - **Region:** Choose closest to your services
   - **PostgreSQL Version:** Latest (14+)

4. **Get Connection String:**
   - Copy the **Internal Database URL** (for Render services)
   - Copy the **External Database URL** (for local development)

### Option 2: External PostgreSQL

Use any PostgreSQL provider (AWS RDS, Supabase, Neon, etc.) and use their connection string.

### Step 2: Run Migrations

After backend is deployed, migrations should run automatically, or run manually:

**Option A: Via Render Shell**
1. Open backend service in Render
2. Go to **"Shell"** tab
3. Run:
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

**Option B: Via Local Machine**
```bash
cd backend
DATABASE_URL="your-external-db-url" npx prisma migrate deploy
```

---

## 🔐 Environment Variables

### Frontend (Vercel)

```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
NEXT_PUBLIC_ENVIRONMENT=production
```

### Backend (Render)

```bash
# Server
NODE_ENV=production
PORT=8000

# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=https://your-frontend.vercel.app

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Email (Optional - for invitations)
EMAIL_FROM=noreply@finapilot.com
SENDGRID_API_KEY=your-sendgrid-key  # If using SendGrid

# LLM (Optional - for AI features)
GEMINI_API_KEY=your-gemini-key
LLM_PROVIDER=gemini

# OAuth (Optional - for connectors)
QUICKBOOKS_CLIENT_ID=your-quickbooks-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-secret
XERO_CLIENT_ID=your-xero-id
XERO_CLIENT_SECRET=your-xero-secret
```

### Python Worker (Render)

```bash
# Database (same as backend)
DATABASE_URL=postgresql://user:pass@host:port/dbname

# AWS S3 (same as backend)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

---

## 📝 Post-Deployment Steps

### 1. Verify Services

**Frontend:**
- ✅ Opens at Vercel URL
- ✅ API calls work (check browser console)
- ✅ Authentication works

**Backend:**
- ✅ Health check responds
- ✅ API endpoints work (test `/api/v1/auth/login`)
- ✅ Database connection works

**Python Worker:**
- ✅ Worker is running (check Render logs)
- ✅ Polling jobs table (check logs for polling messages)
- ✅ Jobs are being processed

### 2. Run Database Migrations

```bash
# Via Render Shell (backend service)
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 3. Test Critical Features

1. **Authentication:**
   - Signup new user
   - Login
   - Token refresh

2. **Data Import:**
   - Upload CSV
   - Verify job completes

3. **Model Runs:**
   - Create model
   - Run model
   - Verify results

4. **Monte Carlo:**
   - Run simulation
   - Verify job completes

### 4. Configure CORS (if needed)

If frontend and backend are on different domains, update CORS in `backend/src/app.ts`:

```typescript
app.use(cors({
  origin: ['https://your-frontend.vercel.app'],
  credentials: true
}));
```

---

## 🔍 Monitoring & Maintenance

### Render Logs

**Backend Logs:**
- Go to backend service → **"Logs"** tab
- Monitor API requests, errors, job creation

**Python Worker Logs:**
- Go to worker service → **"Logs"** tab
- Monitor job processing, errors, completion

### Vercel Analytics

- Enable Vercel Analytics in project settings
- Monitor frontend performance, errors

### Database Monitoring

**Render PostgreSQL:**
- Monitor connection count, query performance
- Set up alerts for storage/connection limits

**External Database:**
- Use provider's monitoring tools

### Health Checks

Add health check endpoints:

**Backend (`/health`):**
```typescript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Backup Strategy

**Database:**
- Render PostgreSQL: Automatic daily backups (included)
- External: Configure backup schedule

**File Storage:**
- S3 versioning enabled
- Regular backups of critical files

---

## 🔧 Troubleshooting

### Frontend Can't Connect to Backend

**Problem:** CORS errors or connection refused

**Solution:**
1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check backend is running (Render dashboard)
3. Check CORS configuration in backend

### Python Worker Not Processing Jobs

**Problem:** Jobs stuck in "queued" status

**Solution:**
1. Check worker logs for errors
2. Verify `DATABASE_URL` is correct
3. Check worker is running (Render dashboard)
4. Verify database connection

### Database Connection Errors

**Problem:** "Connection refused" or "timeout"

**Solution:**
1. Use **Internal Database URL** for Render services
2. Verify database is running
3. Check firewall/security groups
4. Verify credentials

### Build Failures

**Frontend (Vercel):**
- Check `package.json` dependencies
- Verify Node.js version compatibility
- Check build logs for specific errors

**Backend (Render):**
- Verify all environment variables are set
- Check TypeScript compilation errors
- Verify Prisma client is generated

### JavaScript Heap Out of Memory (Build Error)

**Problem:** Build fails with "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory"

**Solution:**
1. The build script has been updated to use `--max-old-space-size=4096` (4GB memory)
2. TypeScript config optimized with incremental compilation
3. If still failing, upgrade to **Standard** instance type ($25/month) which has more memory
4. Alternative: Use the build command directly in Render:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build && npx prisma migrate deploy
   ```

---

## 💰 Cost Estimation

### Development/Testing

- **Vercel Frontend:** Free tier (hobby)
- **Render Backend:** Starter ($7/month)
- **Render Worker:** Starter ($7/month)
- **Render PostgreSQL:** Free tier (90 days) or Starter ($7/month)

**Total:** ~$21/month (or $7/month with free PostgreSQL)

### Production

- **Vercel Frontend:** Pro ($20/month) or Enterprise
- **Render Backend:** Standard ($25/month) or higher
- **Render Worker:** Standard ($25/month) or higher
- **Render PostgreSQL:** Standard ($20/month) or higher

**Total:** ~$90/month minimum for production

---

## 🚀 Quick Deploy Checklist

- [ ] GitHub repository connected
- [ ] Vercel project created (frontend)
- [ ] Render web service created (backend)
- [ ] Render background worker created (python-worker)
- [ ] PostgreSQL database created
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Health checks passing
- [ ] Frontend connects to backend
- [ ] Worker processing jobs
- [ ] Test user signup/login works
- [ ] Test job creation/completion works

---

## 📞 Support

For deployment issues:

1. **Render Documentation:** [render.com/docs](https://render.com/docs)
2. **Vercel Documentation:** [vercel.com/docs](https://vercel.com/docs)
3. **Project Logs:** Check service logs in respective dashboards

---

**Last Updated:** January 17, 2025  
**Version:** 1.0
