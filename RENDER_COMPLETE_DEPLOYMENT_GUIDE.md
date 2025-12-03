# Complete Render Deployment Guide
## FinaPilot - Backend, Frontend, Database, and Python Worker

**Last Updated:** December 3, 2024  
**Status:** Production Ready

---

## 🎯 Overview

This guide covers deploying all FinaPilot components on Render:
1. **PostgreSQL Database** (Render Managed PostgreSQL)
2. **Backend API** (Node.js/Express)
3. **Frontend** (Next.js on Vercel - already deployed)
4. **Python Worker** (Background Worker)

---

## 📋 Prerequisites

- [ ] Render account created
- [ ] GitHub repository connected
- [ ] PostgreSQL database created on Render
- [ ] AWS S3 bucket created (for file storage)

---

## Step 1: PostgreSQL Database Setup

### Create Database

1. Go to **Render Dashboard** → **"New +"** → **"PostgreSQL"**
2. **Name:** `finapilot-db`
3. **Database:** `finapilot`
4. **User:** `finapilot_user`
5. **Region:** `Oregon` (or your preferred region)
6. **Plan:** Choose based on needs (Free tier available)
7. Click **"Create Database"**

### Get Connection Strings

After creation, go to database service → **"Info"** tab:

**Internal Database URL** (Use this for all services):
```
postgresql://finapilot_user:PASSWORD@dpg-XXXXX-a:5432/finapilot
```

**⚠️ IMPORTANT:** 
- Use **Internal Database URL** (NOT Connection Pooler URL)
- Use **Internal Database URL** (NOT External URL)
- This URL is for services **within Render**

**Copy this URL** - you'll need it for backend and worker!

---

## Step 2: Backend API Deployment

### Create Web Service

1. Go to **Render Dashboard** → **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select repository: `hxx-12345678/FIN`

### Configure Service

**Name:** `finapilot-backend`

**Environment:** `Node`

**Region:** Same as database (Oregon)

**Branch:** `main`

**Root Directory:** `backend`

**Build Command:**
```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

**Start Command:**
```bash
npm start
```

### Environment Variables

Go to **"Environment"** tab and add:

```bash
# Database (CRITICAL - Use Internal Database URL from Step 1)
DATABASE_URL=postgresql://finapilot_user:PASSWORD@dpg-XXXXX-a:5432/finapilot

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Node Environment
NODE_ENV=production
PORT=8000

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Frontend URL (for CORS)
FRONTEND_URL=https://fin-plum.vercel.app

# Backend URL
BACKEND_URL=https://fin-k87e.onrender.com

# LLM (Optional - for AI features)
GEMINI_API_KEY=your-gemini-api-key
LLM_PROVIDER=gemini
```

### Deploy

1. Click **"Create Web Service"**
2. Wait for build to complete
3. Check logs for: `✅ Database connected successfully`
4. Verify health: `https://your-backend.onrender.com/health`

---

## Step 3: Python Worker Deployment

### Create Background Worker

1. Go to **Render Dashboard** → **"New +"** → **"Background Worker"**
2. Connect same GitHub repository: `hxx-12345678/FIN`

### Configure Service

**Name:** `finapilot-python-worker`

**Environment:** `Python 3`

**Region:** Same as backend (Oregon)

**Branch:** `main`

**Root Directory:** `python-worker`

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
python worker.py
```

### Environment Variables

Go to **"Environment"** tab and add:

```bash
# Database (CRITICAL - MUST MATCH BACKEND EXACTLY)
# Copy the EXACT same DATABASE_URL from backend service
DATABASE_URL=postgresql://finapilot_user:PASSWORD@dpg-XXXXX-a:5432/finapilot

# AWS S3 (MUST MATCH BACKEND)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Worker Configuration
WORKER_CONCURRENCY=4
WORKER_ID=render-worker-1
PYTHONUNBUFFERED=1

# Python Version (Optional - set via runtime.txt)
PYTHON_VERSION=3.11.9
```

### ⚠️ CRITICAL: DATABASE_URL Must Match Backend

**The Python worker's DATABASE_URL MUST be EXACTLY the same as the backend's DATABASE_URL.**

**How to ensure they match:**

1. Go to **Backend Service** → **Environment** → Copy `DATABASE_URL`
2. Go to **Python Worker Service** → **Environment** → Paste `DATABASE_URL`
3. **Verify character-by-character** they are identical
4. Save and redeploy

### Deploy

1. Click **"Create Background Worker"**
2. Wait for build to complete
3. Check logs for:
   ```
   ✅ Database connection successful
   ✅ 'jobs' table verified
   📊 Tables in 'public' schema: 32
   ```

---

## Step 4: Frontend Deployment (Vercel)

### Already Deployed

Your frontend is already on Vercel: `https://fin-plum.vercel.app`

### Environment Variables

Go to **Vercel Dashboard** → **Project Settings** → **Environment Variables**:

```bash
NEXT_PUBLIC_API_URL=https://fin-k87e.onrender.com/api/v1
```

**⚠️ Important:** Include `/api/v1` in the URL!

---

## 🔍 Verification Checklist

### Database
- [ ] PostgreSQL database created
- [ ] Internal Database URL copied
- [ ] Database has 32+ tables (run migrations)

### Backend
- [ ] Web service created
- [ ] DATABASE_URL set (Internal URL)
- [ ] All environment variables set
- [ ] Build successful
- [ ] Health check: `/health` returns 200
- [ ] Database connection successful in logs

### Python Worker
- [ ] Background worker created
- [ ] DATABASE_URL matches backend EXACTLY
- [ ] All environment variables set
- [ ] Build successful
- [ ] Logs show: `✅ 'jobs' table verified`
- [ ] Logs show: `Tables in 'public' schema: 32` (not 0!)

### Frontend
- [ ] Deployed on Vercel
- [ ] `NEXT_PUBLIC_API_URL` set correctly
- [ ] CORS working (no CORS errors in browser)

---

## 🚨 Common Issues & Solutions

### Issue 1: Python Worker Shows "0 tables"

**Problem:** Worker finds 0 tables in database

**Solution:**
1. Verify DATABASE_URL in worker matches backend EXACTLY
2. Ensure using **Internal Database URL** (not pooler URL)
3. Check database has tables: Run migrations on backend
4. Verify both services use same database name

**How to verify:**
- Backend logs should show database connection
- Worker logs should show: `Tables in 'public' schema: 32`

### Issue 2: "relation jobs does not exist"

**Problem:** Database migrations not run

**Solution:**
1. Ensure backend build command includes: `npx prisma migrate deploy`
2. Or run manually: SSH into backend and run `npx prisma migrate deploy`
3. Verify migrations table exists: `SELECT * FROM _prisma_migrations;`

### Issue 3: CORS Errors

**Problem:** Frontend can't call backend API

**Solution:**
1. Backend CORS configured (already done)
2. Frontend `NEXT_PUBLIC_API_URL` set correctly
3. Verify backend allows: `https://fin-plum.vercel.app`

### Issue 4: Build Fails (scipy)

**Problem:** scipy requires Fortran compiler

**Solution:**
1. `runtime.txt` created with `python-3.11.9`
2. Or set `PYTHON_VERSION=3.11.9` in environment variables
3. Updated `requirements.txt` with compatible versions

---

## 📊 Service URLs Summary

After deployment, you should have:

| Service | URL | Status |
|---------|-----|--------|
| Frontend | `https://fin-plum.vercel.app` | ✅ Deployed |
| Backend | `https://fin-k87e.onrender.com` | ⚙️ Deploy |
| Database | `dpg-XXXXX-a.oregon-postgres.render.com` | ⚙️ Create |
| Python Worker | Background Worker (no URL) | ⚙️ Deploy |

---

## 🔧 Database Migration Commands

### Run Migrations on Backend

**Option 1: Via Build Command** (Recommended)
```
npm install && npx prisma generate && npx prisma migrate deploy
```

**Option 2: Via Start Command**
```
npx prisma migrate deploy && npm start
```

**Option 3: Manual (if needed)**
1. Go to Backend service → **"Shell"** tab
2. Run: `npx prisma migrate deploy`

---

## ✅ Final Verification

### Test Backend
```bash
curl https://fin-k87e.onrender.com/health
```
Should return: `{"ok": true, "status": "healthy"}`

### Test Database Connection
```bash
curl https://fin-k87e.onrender.com/api/v1
```
Should return API info

### Test Python Worker
Check worker logs - should show:
```
✅ Database connection successful
✅ 'jobs' table verified
📊 Tables in 'public' schema: 32
🚀 FinaPilot Python Worker started
```

### Test Frontend
1. Open `https://fin-plum.vercel.app`
2. Try to sign up
3. Should work without CORS errors

---

## 🎯 Quick Reference

### DATABASE_URL Format
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

### Where to Get DATABASE_URL
1. Render Dashboard → PostgreSQL Database service
2. "Info" tab → "Internal Database URL"
3. Copy entire string

### Critical Environment Variables

**Backend:**
- `DATABASE_URL` (Internal URL)
- `JWT_SECRET`
- `NODE_ENV=production`

**Python Worker:**
- `DATABASE_URL` (SAME as backend - EXACT match)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`

**Frontend:**
- `NEXT_PUBLIC_API_URL` (with `/api/v1`)

---

## 📞 Troubleshooting

### Worker Still Shows 0 Tables

1. **Double-check DATABASE_URL:**
   - Backend: Copy from Environment tab
   - Worker: Paste EXACT same value
   - Compare character-by-character

2. **Verify Database:**
   - Go to PostgreSQL service
   - Check "Info" tab
   - Ensure using Internal URL (not pooler)

3. **Check Migrations:**
   - Backend logs should show migrations running
   - Or run manually: `npx prisma migrate deploy`

4. **Test Connection:**
   - Use test script: `node backend/scripts/test-production-db.js`
   - Should show 32 tables

---

**That's it! Follow this guide step-by-step and your deployment will work perfectly!** 🚀

