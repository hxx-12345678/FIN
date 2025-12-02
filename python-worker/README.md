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

## Job Types

- `csv_import` - Parse CSV and import transactions
- `model_run` - Compute deterministic model scenarios
- `monte_carlo` - Run Monte Carlo simulations
- `export_pdf` - Generate PDF exports
- `export_pptx` - Generate PowerPoint exports
- `export_csv` - Generate CSV exports

## Architecture

The worker polls the `jobs` table every 2 seconds, picks up queued jobs, and dispatches them to the appropriate handler. No message queues needed - direct database polling.

