# Deploying Python Worker on Render

## How Python Worker Works

### Architecture Overview

```
Client (Frontend) 
    ↓ HTTP Request
Backend (Node.js/Express)
    ↓ Creates Job in Database
PostgreSQL Database (jobs table)
    ↓ Polls every 2 seconds
Python Worker
    ↓ Processes Job
    ↓ Updates Job Status
Backend checks job status
    ↓ Returns result to client
```

### Key Points:

1. **NO Direct Client Communication**: The Python worker does NOT receive requests directly from the client
2. **Database-Driven Queue**: The backend creates jobs in the `jobs` table, and the Python worker polls this table
3. **Polling Pattern**: Worker polls every 2 seconds for new jobs
4. **Job Reservation**: Worker atomically reserves jobs to prevent duplicate processing
5. **Shared Database**: Both backend and worker connect to the same PostgreSQL database

### Job Flow:

1. **Client** makes API request to backend (e.g., `/api/v1/models/:id/run`)
2. **Backend** creates a job record in `jobs` table with status `queued`
3. **Python Worker** polls database, finds job, reserves it (status → `processing`)
4. **Python Worker** processes the job (Monte Carlo, export, etc.)
5. **Python Worker** updates job status to `completed` or `failed`
6. **Backend** can check job status via `/api/v1/jobs/:id`
7. **Client** polls or uses WebSocket to get job completion

---

## Deployment Steps on Render

### Step 1: Create Background Worker Service

1. Go to your Render Dashboard: https://dashboard.render.com
2. Click **"New +"** → **"Background Worker"**
3. Connect your Git repository (same repo as backend)

### Step 2: Configure Service Settings

**Name:** `finapilot-python-worker` (or your preferred name)

**Environment:** `Python 3`

**Region:** Same region as your backend (for lower latency)

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

### Step 3: Set Environment Variables

Add these environment variables in Render:

#### Required Variables:

```bash
# Database (SAME as backend)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Worker Configuration (Optional)
WORKER_CONCURRENCY=4                    # Number of parallel jobs (default: 4)
WORKER_ID=render-worker-1               # Unique worker ID
WORKER_GRACEFUL_SHUTDOWN_TIMEOUT=180    # Seconds to wait on shutdown
```

#### Optional Variables:

```bash
# Logging
LOG_LEVEL=INFO                          # DEBUG, INFO, WARNING, ERROR

# Python Environment
PYTHONUNBUFFERED=1                      # Recommended for Render
```

### Step 4: Advanced Settings

**Auto-Deploy:** `Yes` (deploy on every push)

**Health Check Path:** Leave empty (worker doesn't have HTTP endpoint)

**Dockerfile Path:** Leave empty (using build command)

---

## Environment Variables Setup

### Copy from Backend Service

Since the worker uses the same database, you can copy these from your backend service:

1. Go to your **Backend Service** on Render
2. Go to **Environment** tab
3. Copy these variables:
   - `DATABASE_URL`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `S3_BUCKET_NAME`

4. Go to your **Python Worker** service
5. Paste them in the **Environment** tab

### Add Worker-Specific Variables

Add these additional variables to the worker:

```bash
WORKER_CONCURRENCY=4
WORKER_ID=render-worker-1
PYTHONUNBUFFERED=1
```

---

## Verification Steps

### 1. Check Worker Logs

After deployment, check the Render logs. You should see:

```
🚀 FinaPilot Python Worker started
📊 Polling interval: 2 seconds
⚙️  Worker concurrency: 4
🆔 Worker ID: render-worker-1
✅ Database connection successful
🔍 Checking for stuck jobs...
```

### 2. Test Job Processing

1. Make a request that creates a job (e.g., run a model)
2. Check backend logs - should see job created
3. Check worker logs - should see job picked up and processed
4. Check database - job status should update

### 3. Monitor Worker Health

- **Logs**: Check Render logs for errors
- **Database**: Query `jobs` table to see job processing
- **Metrics**: Worker logs include timing and success/failure

---

## Scaling Workers

### Multiple Workers

You can run multiple worker instances:

1. Create additional Background Worker services
2. Use different `WORKER_ID` for each (e.g., `render-worker-1`, `render-worker-2`)
3. All workers poll the same database
4. Job reservation prevents duplicate processing

### Worker Concurrency

Adjust `WORKER_CONCURRENCY` based on:
- CPU resources available
- Job complexity
- Database connection limits

**Recommended:**
- Small instances: `WORKER_CONCURRENCY=2`
- Medium instances: `WORKER_CONCURRENCY=4`
- Large instances: `WORKER_CONCURRENCY=8`

---

## Troubleshooting

### Worker Not Starting

**Check:**
- ✅ Build command completed successfully
- ✅ Start command is correct: `python worker.py`
- ✅ `DATABASE_URL` is set correctly
- ✅ Database is accessible from Render

### Jobs Not Processing

**Check:**
- ✅ Worker logs show "Database connection successful"
- ✅ Jobs are being created in database (`status = 'queued'`)
- ✅ Worker is polling (check logs for polling activity)
- ✅ No errors in worker logs

### Database Connection Errors

**Check:**
- ✅ `DATABASE_URL` format is correct
- ✅ Database allows connections from Render IPs
- ✅ Database credentials are correct
- ✅ Database is not at connection limit

### Job Stuck in Processing

**Check:**
- ✅ Worker is running (not crashed)
- ✅ Check `jobs` table for stuck jobs
- ✅ Worker will auto-release stuck jobs on startup
- ✅ Manually update job status if needed

---

## Cost Considerations

### Render Pricing

- **Free Tier**: 750 hours/month (enough for 1 worker running 24/7)
- **Starter Plan**: $7/month per service
- **Professional Plan**: $25/month per service

### Optimization Tips

1. **Single Worker**: Start with 1 worker, scale if needed
2. **Concurrency**: Adjust `WORKER_CONCURRENCY` based on load
3. **Auto-Sleep**: Free tier workers sleep after 15 min inactivity
4. **Monitoring**: Use Render logs to track job processing times

---

## Production Checklist

- [ ] Worker service created on Render
- [ ] Environment variables set (DATABASE_URL, AWS credentials)
- [ ] Worker-specific variables set (WORKER_ID, WORKER_CONCURRENCY)
- [ ] Build command: `pip install -r requirements.txt`
- [ ] Start command: `python worker.py`
- [ ] Worker logs show successful startup
- [ ] Test job creation and processing
- [ ] Monitor worker health and performance
- [ ] Set up alerts for worker failures (if using paid plan)

---

## Example Render Configuration

### Service Settings Summary:

```
Name: finapilot-python-worker
Environment: Python 3
Region: Oregon (or same as backend)
Branch: main
Root Directory: python-worker
Build Command: pip install -r requirements.txt
Start Command: python worker.py
```

### Environment Variables Summary:

```
DATABASE_URL=<from backend>
AWS_ACCESS_KEY_ID=<from backend>
AWS_SECRET_ACCESS_KEY=<from backend>
AWS_REGION=<from backend>
S3_BUCKET_NAME=<from backend>
WORKER_CONCURRENCY=4
WORKER_ID=render-worker-1
PYTHONUNBUFFERED=1
```

---

**That's it! Your Python worker should now be processing jobs from your backend.**

