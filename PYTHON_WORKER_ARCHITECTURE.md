# Python Worker Architecture & Deployment Guide

## 🔄 How Python Worker Works

### Communication Flow

```
┌─────────────┐
│   Client    │ (Frontend - Vercel)
│  (Browser)  │
└──────┬──────┘
       │ HTTP Request
       │ POST /api/v1/models/:id/run
       ▼
┌─────────────────┐
│  Backend API    │ (Node.js - Render)
│  (Express)      │
└──────┬──────────┘
       │ Creates Job
       │ INSERT INTO jobs (status='queued')
       ▼
┌─────────────────┐
│   PostgreSQL    │ (Database - Render)
│   jobs table    │
└──────┬──────────┘
       │ Polls every 2 seconds
       │ SELECT * FROM jobs WHERE status='queued'
       ▼
┌─────────────────┐
│ Python Worker   │ (Background Worker - Render)
│  (worker.py)    │
└─────────────────┘
       │
       │ Processes Job
       │ - Monte Carlo simulation
       │ - PDF/PPTX export
       │ - CSV import
       │ - Model runs
       │
       ▼ Updates Job Status
┌─────────────────┐
│   PostgreSQL    │
│   jobs table    │
│ status='completed'│
└─────────────────┘
```

### Key Points:

1. **NO Direct Client Communication**
   - ❌ Client does NOT call Python worker directly
   - ✅ Client calls Backend API
   - ✅ Backend creates job in database
   - ✅ Python worker polls database

2. **Database-Driven Queue**
   - Uses PostgreSQL `jobs` table as a queue
   - No Redis/RabbitMQ needed
   - Simple and reliable

3. **Polling Pattern**
   - Worker polls every 2 seconds
   - Checks for jobs with `status = 'queued'`
   - Atomically reserves jobs to prevent duplicates

4. **Shared Database**
   - Backend and Worker use the SAME database
   - Same `DATABASE_URL` environment variable
   - Both connect to same PostgreSQL instance

---

## 📋 Step-by-Step Deployment on Render

### Step 1: Create Background Worker Service

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Click **"New +"** button (top right)
3. Select **"Background Worker"**

### Step 2: Connect Repository

1. **Connect your Git repository** (same repo as backend)
2. Select the repository
3. Click **"Connect"**

### Step 3: Configure Service

Fill in these settings:

**Name:** `finapilot-python-worker`

**Environment:** `Python 3`

**Region:** Same as your backend (e.g., `Oregon`)

**Branch:** `main` (or your default branch)

**Root Directory:** `python-worker`

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
python worker.py
```

### Step 4: Set Environment Variables

Click **"Environment"** tab and add:

#### Required Variables (Copy from Backend):

```bash
# Database - MUST be same as backend
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# AWS S3 - MUST be same as backend
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

#### Worker-Specific Variables:

```bash
# Worker Configuration
WORKER_CONCURRENCY=4
WORKER_ID=render-worker-1
PYTHONUNBUFFERED=1
```

**How to Copy from Backend:**
1. Go to your **Backend Service** on Render
2. Click **"Environment"** tab
3. Copy `DATABASE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`
4. Go back to **Python Worker** service
5. Paste them in **"Environment"** tab

### Step 5: Deploy

1. Click **"Create Background Worker"**
2. Render will:
   - Clone your repository
   - Run build command (`pip install -r requirements.txt`)
   - Start worker (`python worker.py`)
3. Wait for deployment (2-3 minutes)

### Step 6: Verify Deployment

Check the **Logs** tab. You should see:

```
🚀 FinaPilot Python Worker started
📊 Polling interval: 2 seconds
⚙️  Worker concurrency: 4
🆔 Worker ID: render-worker-1
✅ Database connection successful
🔍 Checking for stuck jobs...
```

---

## 🧪 Testing the Worker

### Test 1: Create a Job

1. Make a request to your backend that creates a job:
   ```bash
   # Example: Run a model
   POST https://fin-k87e.onrender.com/api/v1/models/{modelId}/run
   ```

2. Check backend logs - should see job created

3. Check worker logs - should see:
   ```
   📦 Reserved job: {job_id} (type: model_run)
   ⚙️  Processing job: {job_id}
   ✅ Job completed: {job_id}
   ```

### Test 2: Check Database

Query the `jobs` table:
```sql
SELECT id, type, status, "createdAt", "updatedAt" 
FROM jobs 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

You should see:
- Jobs with `status = 'queued'` (waiting)
- Jobs with `status = 'processing'` (being processed)
- Jobs with `status = 'completed'` (done)

---

## 🔧 Configuration Options

### Worker Concurrency

Controls how many jobs run in parallel:

```bash
WORKER_CONCURRENCY=4  # Default: 4
```

**Recommendations:**
- **Free tier**: `2` (limited CPU)
- **Starter plan**: `4` (good balance)
- **Professional plan**: `8` (high performance)

### Worker ID

Unique identifier for each worker instance:

```bash
WORKER_ID=render-worker-1
```

**Use different IDs if running multiple workers:**
- `render-worker-1`
- `render-worker-2`
- `render-worker-3`

### Polling Interval

Currently hardcoded to 2 seconds in `worker.py`. To change:

Edit `python-worker/worker.py`:
```python
POLL_INTERVAL = 2  # Change this value
```

---

## 📊 Monitoring

### Render Logs

1. Go to your **Python Worker** service
2. Click **"Logs"** tab
3. Monitor for:
   - ✅ Job processing messages
   - ❌ Error messages
   - ⚠️ Warning messages

### Database Queries

Check job status:
```sql
-- Jobs by status
SELECT status, COUNT(*) 
FROM jobs 
GROUP BY status;

-- Recent jobs
SELECT id, type, status, "createdAt", "updatedAt"
FROM jobs 
ORDER BY "createdAt" DESC 
LIMIT 20;

-- Stuck jobs (processing > 10 minutes)
SELECT id, type, "createdAt", "updatedAt"
FROM jobs 
WHERE status = 'processing' 
  AND "updatedAt" < NOW() - INTERVAL '10 minutes';
```

---

## 🚨 Troubleshooting

### Worker Not Starting

**Symptoms:**
- No logs appearing
- Service shows "Failed" status

**Solutions:**
1. Check **Build Command**: `pip install -r requirements.txt`
2. Check **Start Command**: `python worker.py`
3. Check **Root Directory**: `python-worker`
4. Check **Logs** for error messages

### Database Connection Failed

**Symptoms:**
- Logs show: `❌ Failed to connect to database`

**Solutions:**
1. Verify `DATABASE_URL` is set correctly
2. Ensure database allows connections from Render
3. Check database credentials
4. Verify database is running

### Jobs Not Processing

**Symptoms:**
- Jobs stuck in `queued` status
- Worker logs show no activity

**Solutions:**
1. Check worker is running (logs should show polling)
2. Verify `DATABASE_URL` matches backend
3. Check for errors in worker logs
4. Verify jobs table has queued jobs

### Jobs Stuck in Processing

**Symptoms:**
- Jobs with `status = 'processing'` for > 10 minutes

**Solutions:**
1. Worker auto-releases stuck jobs on startup
2. Manually update in database:
   ```sql
   UPDATE jobs 
   SET status = 'failed', 
       "errorMessage" = 'Stuck job released'
   WHERE status = 'processing' 
     AND "updatedAt" < NOW() - INTERVAL '10 minutes';
   ```

---

## 💰 Cost Considerations

### Render Pricing

- **Free Tier**: 750 hours/month (enough for 1 worker 24/7)
- **Starter Plan**: $7/month per service
- **Professional Plan**: $25/month per service

### Optimization Tips

1. **Start with 1 worker** - Scale if needed
2. **Adjust concurrency** - Based on load
3. **Monitor usage** - Check Render dashboard
4. **Free tier sleeps** - After 15 min inactivity (wakes on new job)

---

## ✅ Deployment Checklist

- [ ] Background Worker service created
- [ ] Repository connected
- [ ] Root directory set to `python-worker`
- [ ] Build command: `pip install -r requirements.txt`
- [ ] Start command: `python worker.py`
- [ ] `DATABASE_URL` copied from backend
- [ ] AWS credentials copied from backend
- [ ] `WORKER_CONCURRENCY` set (default: 4)
- [ ] `WORKER_ID` set (unique identifier)
- [ ] `PYTHONUNBUFFERED=1` set
- [ ] Deployment successful
- [ ] Logs show successful startup
- [ ] Test job creation and processing
- [ ] Monitor worker health

---

## 🎯 Summary

**How it works:**
1. Client → Backend API (creates job)
2. Backend → Database (inserts job)
3. Python Worker → Database (polls for jobs)
4. Python Worker → Processes job → Updates database
5. Backend → Checks job status → Returns to client

**Deployment:**
1. Create Background Worker on Render
2. Set same `DATABASE_URL` as backend
3. Set same AWS credentials as backend
4. Add worker-specific variables
5. Deploy and verify

**That's it! Your Python worker is now processing jobs from your backend.**

