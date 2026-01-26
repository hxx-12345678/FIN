# FinaPilot Python Worker

Python worker that polls the jobs table and processes heavy compute tasks.

## Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   export DATABASE_URL="postgresql://user:password@localhost:5432/finapilot"
   export AWS_ACCESS_KEY_ID="your-key"
   export AWS_SECRET_ACCESS_KEY="your-secret"
   export AWS_REGION="us-east-1"
   export S3_BUCKET_NAME="your-bucket"
   ```

3. **Run Worker**
   ```bash
   python worker.py
   ```

### Run as HTTP service (FastAPI)

You can run the worker as an HTTP service so jobs can be queued and triggered via HTTP.

```bash
# Install dependencies (includes FastAPI and Uvicorn)
pip install -r requirements.txt

# Run with Uvicorn (bind 0.0.0.0 to accept external requests)
# For local development:
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 1
# For production/Render (ensures uvicorn is found):
python -m uvicorn app:app --host 0.0.0.0 --port $PORT
```

The FastAPI app includes background polling, so it will automatically process queued jobs.

Endpoints:
- `GET /health` — basic health check
- `POST /queue_job` — queue a job into the database
- `POST /run_next` — reserve and run the next job (optionally in background)
- `POST /run_job_direct` — run a handler directly (useful for testing)
- `GET /release_stuck_jobs` — release stuck jobs

Note: These endpoints interact with the same `jobs` table as the background poller and
require a correctly configured `DATABASE_URL` and related environment variables
(S3, AWS credentials, etc.) for handlers that use external services.

## Job Types

- `csv_import` - Parse CSV and import transactions
- `model_run` - Compute deterministic model scenarios
- `monte_carlo` - Run Monte Carlo simulations
- `export_pdf` - Generate PDF exports
- `export_pptx` - Generate PowerPoint exports
- `export_csv` - Generate CSV exports

## Architecture

The worker polls the `jobs` table every 2 seconds, picks up queued jobs, and dispatches them to the appropriate handler. No message queues needed - direct database polling.

