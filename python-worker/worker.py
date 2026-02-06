#!/usr/bin/env python3
"""
FinaPilot Python Worker
Polls jobs table every 2 seconds and dispatches to job handlers
Implements reservation, visibility timeout, graceful shutdown, and retry logic
"""

import os
import time
import sys
import signal
import threading
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

# Load environment variables at the very top to ensure they are available for all imports
load_dotenv()

from utils.db import get_db_connection
from utils.logger import setup_logger
from jobs.csv_import import handle_csv_import
from jobs.xlsx_import import handle_xlsx_preview, handle_xlsx_import
from jobs.model_run import handle_model_run
from jobs.auto_model import handle_auto_model
from jobs.monte_carlo import handle_monte_carlo
from jobs.export_pdf import handle_export_pdf
from jobs.export_pptx import handle_export_pptx
from jobs.investor_export_pdf import handle_investor_export_pdf
from jobs.investor_export_pptx import handle_investor_export_pptx
from jobs.export_csv import handle_export_csv
from jobs.provenance_export import handle_provenance_export
from jobs.data_sync import handle_data_sync
from jobs.notification import handle_notification_task
from jobs.auto_model_trigger import handle_auto_model_trigger
from jobs.scheduled_auto_model import handle_scheduled_auto_model
from jobs.scheduled_connector_sync import handle_scheduled_connector_sync
from jobs.connector_sync import handle_connector_sync
from jobs.alert_check import handle_alert_check
from jobs.aicfo_chat import handle_aicfo_chat
from jobs.runner import reserve_job, run_job_with_retry, release_stuck_jobs

logger = setup_logger()

JOB_HANDLERS = {
    'csv_import': handle_csv_import,
    'xlsx_preview': handle_xlsx_preview,
    'xlsx_import': handle_xlsx_import,
    'model_run': handle_model_run,
    'auto_model': handle_auto_model,
    'monte_carlo': handle_monte_carlo,
    'alert_check': handle_alert_check,
    'export_pdf': handle_export_pdf,
    'export_pptx': handle_export_pptx,
    'investor_export_pdf': handle_investor_export_pdf,
    'investor_export_pptx': handle_investor_export_pptx,
    'export_csv': handle_export_csv,
    'provenance_export': handle_provenance_export,
    'data_sync': handle_data_sync,
    'notification': handle_notification_task,
    'auto_model_trigger': handle_auto_model_trigger,
    'scheduled_auto_model': handle_scheduled_auto_model,
    'scheduled_connector_sync': handle_scheduled_connector_sync,
    'connector_sync': handle_connector_sync,
    'connector_initial_sync': handle_connector_sync,
    'aicfo_chat': handle_aicfo_chat,
}

POLL_INTERVAL = 0.5  # Reduced from 2s for faster chat response
WORKER_CONCURRENCY = int(os.getenv('WORKER_CONCURRENCY', '4'))
GRACEFUL_SHUTDOWN_TIMEOUT = int(os.getenv('WORKER_GRACEFUL_SHUTDOWN_TIMEOUT', '180'))  # 3 minutes

# Global shutdown flag
shutdown_requested = False
active_jobs = {}  # Track active job threads


def process_job(job: dict):
    """
    Process a single job with parallel processing support.
    Supports cancellation, cost estimation, and proper error handling.
    """
    job_id = job['id']
    job_type = job['jobType']
    
    try:
        active_jobs[job_id] = threading.current_thread()
        
        if job_type not in JOB_HANDLERS:
            logger.warning(f"⚠️ Unknown job type: {job_type}")
            from jobs.runner import fail_job
            fail_job(job_id, ValueError(f"Unknown job type: {job_type}"))
            return
        
        handler = JOB_HANDLERS[job_type]
        
        # Run job with retry logic, cancellation checks, and cost tracking
        # The handler itself is responsible for:
        # - Checking cancellation at safe points
        # - Reporting progress
        # - Recording CPU time and billing usage
        run_job_with_retry(job, handler)
        
    except KeyboardInterrupt:
        # Handle graceful shutdown
        logger.info(f"🛑 Job {job_id} interrupted during processing")
        from jobs.runner import mark_cancelled
        mark_cancelled(job_id)
    except Exception as e:
        logger.error(f"❌ Error processing job {job_id}: {str(e)}", exc_info=True)
        from jobs.runner import fail_job
        fail_job(job_id, e)
    finally:
        if job_id in active_jobs:
            del active_jobs[job_id]


def poll_and_process_jobs():
    """Main polling loop - checks for queued jobs every 2 seconds"""
    global shutdown_requested
    
    logger.info("🚀 FinaPilot Python Worker started")
    logger.info(f"📊 Polling interval: {POLL_INTERVAL} seconds")
    logger.info(f"⚙️  Worker concurrency: {WORKER_CONCURRENCY}")
    logger.info(f"🆔 Worker ID: {os.getenv('WORKER_ID', 'default')}")
    
    # Test database connection on startup
    try:
        test_conn = get_db_connection()
        
        # Verify jobs table exists before continuing
        with test_conn.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'jobs'
                );
            """)
            table_exists = cursor.fetchone()[0]
            if not table_exists:
                # List available tables for debugging
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name;
                """)
                tables = [row[0] for row in cursor.fetchall()]
                logger.error(f"❌ 'jobs' table does not exist in database!")
                logger.error(f"Found {len(tables)} tables: {', '.join(tables[:10])}")
                logger.error("Please ensure:")
                logger.error("1. DATABASE_URL is correct (same as backend)")
                logger.error("2. Database migrations have been run")
                logger.error("3. Run: npx prisma migrate deploy")
                test_conn.close()
                sys.exit(1)
        
        test_conn.close()
        logger.info("✅ Database connection successful")
        logger.info("✅ 'jobs' table verified")
    except ValueError as e:
        # This is raised by get_db_connection when table doesn't exist
        logger.error(f"❌ Database setup error: {str(e)}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {str(e)}")
        logger.error("Please check your DATABASE_URL environment variable")
        sys.exit(1)
    
    # Release stuck jobs on startup
    logger.info("🔍 Checking for stuck jobs...")
    for queue in ['default', 'exports', 'montecarlo', 'connectors']:
        released = release_stuck_jobs(queue)
        if released > 0:
            logger.info(f"🔄 Released {released} stuck jobs from queue '{queue}'")
    
    # Thread pool for concurrent job processing
    executor = ThreadPoolExecutor(max_workers=WORKER_CONCURRENCY)
    
    try:
        while not shutdown_requested:
            try:
                # Check if we have capacity
                if len(active_jobs) >= WORKER_CONCURRENCY:
                    time.sleep(POLL_INTERVAL)
                    continue
                
                # Reserve a job (atomic operation)
                # Support multiple queues: check default, then specialized queues
                job = None
                for queue in ['default', 'exports', 'montecarlo', 'connectors']:
                    job = reserve_job(queue)
                    if job:
                        break
                
                if job:
                    # Submit to thread pool for parallel processing
                    # The ThreadPoolExecutor handles concurrent execution
                    future = executor.submit(process_job, job)
                    # Note: We don't wait for completion here - jobs run in parallel
                else:
                    # No jobs available, wait before next poll
                    time.sleep(POLL_INTERVAL)
                    
            except Exception as e:
                logger.error(f"❌ Error in polling loop: {str(e)}", exc_info=True)
                time.sleep(POLL_INTERVAL)
        
        # Graceful shutdown: wait for active jobs to complete
        logger.info(f"🛑 Shutdown requested, waiting for {len(active_jobs)} active jobs...")
        shutdown_start = time.time()
        
        while len(active_jobs) > 0:
            if time.time() - shutdown_start > GRACEFUL_SHUTDOWN_TIMEOUT:
                logger.warning(f"⚠️ Graceful shutdown timeout, {len(active_jobs)} jobs still running")
                break
            time.sleep(1)
        
        # ThreadPoolExecutor.shutdown() timeout parameter was added in Python 3.9
        # Use try/except for compatibility with older Python versions
        try:
            executor.shutdown(wait=True, timeout=GRACEFUL_SHUTDOWN_TIMEOUT)
        except TypeError:
            # Python < 3.9 doesn't support timeout parameter
            executor.shutdown(wait=True)
        logger.info("✅ Worker shutdown complete")
        
    except KeyboardInterrupt:
        logger.info("\n🛑 Shutdown requested via SIGINT")
        shutdown_requested = True
        executor.shutdown(wait=False)


def signal_handler(signum, frame):
    """Handle shutdown signals"""
    global shutdown_requested
    logger.info(f"\n🛑 Received signal {signum}, initiating graceful shutdown...")
    shutdown_requested = True


if __name__ == '__main__':
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        poll_and_process_jobs()
    except Exception as e:
        logger.error(f"❌ Fatal error: {str(e)}", exc_info=True)
        sys.exit(1)

