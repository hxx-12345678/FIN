from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import uuid
import threading
import time

app = FastAPI(title="FinaPilot Worker API")

from jobs import runner as job_runner
from utils.logger import setup_logger
from utils.db import get_db_connection
from worker import JOB_HANDLERS

# Global state
polling_active = False
polling_thread = None
active_jobs = {}  # Track active job threads
from worker import JOB_HANDLERS  # Import handlers for polling


class QueueJobRequest(BaseModel):
    jobType: str
    orgId: str
    objectId: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    queue: Optional[str] = "default"
    priority: Optional[int] = 50


class RunJobDirectRequest(BaseModel):
    jobType: str
    orgId: str
    objectId: Optional[str] = None
    params: Optional[Dict[str, Any]] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/status")
def status():
    """Check worker status including DB connection and polling"""
    try:
        # Test DB connection
        conn = get_db_connection()
        conn.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "ok",
        "database": db_status,
        "polling_active": polling_active,
        "active_jobs": len(active_jobs) if 'active_jobs' in globals() else 0,
    }


@app.post("/queue_job")
def queue_job(req: QueueJobRequest):
    logger = setup_logger()
    logger.info(f"📥 Queue job request: {req.jobType} for org {req.orgId}")
    try:
        job_id = job_runner.queue_job(
            job_type=req.jobType,
            org_id=req.orgId,
            object_id=req.objectId,
            params=req.params,
            queue=req.queue or 'default',
            priority=req.priority or 50,
        )
        if not job_id:
            logger.error("❌ Failed to queue job in DB")
            raise HTTPException(status_code=500, detail="Failed to queue job")
        logger.info(f"✅ Job queued: {job_id}")
        return {"job_id": job_id}
    except ValueError as e:
        # Typically thrown when DATABASE_URL missing or invalid
        logger.error(f"❌ Queue job error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected queue job error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _run_reserved_job_sync(queue: str = 'default'):
    """Reserve one job from the DB and run it synchronously (blocking)."""
    job = job_runner.reserve_job(queue)
    if not job:
        return None
    # Determine handler from jobType
    job_type = job.get('jobType')
    # Map to handler - worker defines handlers; import dynamically to avoid circular imports
    from worker import JOB_HANDLERS
    handler = JOB_HANDLERS.get(job_type)
    if not handler:
        # Mark as failed via runner.fail_job
        from jobs.runner import fail_job
        fail_job(job['id'], ValueError(f"Unknown job type: {job_type}"))
        return job

    # Run with built-in retry and DB updates
    job_runner.run_job_with_retry(job, handler)
    return job


@app.post("/run_next")
def run_next(queue: Optional[str] = 'default', background: Optional[bool] = False, background_tasks: BackgroundTasks = None):
    """Reserve the next job from the given queue and process it.
    If `background=true` the job will be processed in background and the endpoint returns immediately.
    """
    try:
        if background:
            # Run in a background thread to keep request fast
            background_tasks.add_task(_run_reserved_job_sync, queue)
            return JSONResponse({"status": "scheduled"}, status_code=202)
        else:
            job = _run_reserved_job_sync(queue)
            if job is None:
                return JSONResponse({"status": "no_job"}, status_code=204)
            return {"status": "processed", "job_id": job.get('id')}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/run_job_direct")
def run_job_direct(req: RunJobDirectRequest, background: Optional[bool] = False, background_tasks: BackgroundTasks = None):
    """Directly invoke a handler for immediate execution without inserting into DB.
    Note: Many handlers expect DB S3 etc. and may raise errors if environment not configured.
    """
    # Build a fake job dict compatible with run_job_with_retry
    job_id = f"manual-{uuid.uuid4()}"
    logs = {'params': req.params or {}}
    job = {
        'id': job_id,
        'jobType': req.jobType,
        'orgId': req.orgId,
        'objectId': req.objectId,
        'logs': logs,
        'attempts': 0,
        'maxAttempts': 5,
    }

    # Resolve handler from worker mapping
    try:
        from worker import JOB_HANDLERS
        handler = JOB_HANDLERS.get(req.jobType)
        if not handler:
            raise HTTPException(status_code=400, detail=f"Unknown jobType: {req.jobType}")

        if background:
            background_tasks.add_task(job_runner.run_job_with_retry, job, handler)
            return JSONResponse({"status": "scheduled", "job_id": job_id}, status_code=202)
        else:
            # Run synchronously (blocking)
            job_runner.run_job_with_retry(job, handler)
            return {"status": "completed", "job_id": job_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/release_stuck_jobs")
def release_stuck(queue: Optional[str] = 'default'):
    try:
        released = job_runner.release_stuck_jobs(queue)
        return {"released": released}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Background polling
polling_active = False
polling_thread = None

def polling_loop():
    """Background polling loop similar to worker.py"""
    global polling_active, active_jobs
    logger = setup_logger()
    logger.info("🚀 Background polling started")
    while polling_active:
        try:
            # Check capacity
            if len(active_jobs) >= 4:
                time.sleep(0.5)
                continue
            
            # Poll all queues
            for queue in ['default', 'exports', 'montecarlo', 'connectors']:
                job = job_runner.reserve_job(queue)
                if job:
                    logger.info(f"🎯 Reserved job {job['id']} ({job.get('jobType')}) from queue {queue}")
                    # Process the job
                    job_type = job.get('jobType')
                    handler = JOB_HANDLERS.get(job_type)
                    if handler:
                        active_jobs[job['id']] = threading.current_thread()
                        try:
                            logger.info(f"▶️ Starting job {job['id']}")
                            job_runner.run_job_with_retry(job, handler)
                            logger.info(f"✅ Completed job {job['id']}")
                        finally:
                            if job['id'] in active_jobs:
                                del active_jobs[job['id']]
                    else:
                        logger.error(f"❌ Unknown job type: {job_type} for job {job['id']}")
                        job_runner.fail_job(job['id'], ValueError(f"Unknown job type: {job_type}"))
                    break  # Process one job per poll cycle
            else:
                logger.debug("No jobs in any queue")
                time.sleep(0.5)  # No jobs, wait
        except Exception as e:
            logger.error(f"❌ Polling error: {str(e)}", exc_info=True)
            time.sleep(0.5)

@app.on_event("startup")
def startup_event():
    """Start background polling on app startup"""
    global polling_active, polling_thread
    polling_active = True
    polling_thread = threading.Thread(target=polling_loop, daemon=True)
    polling_thread.start()

@app.on_event("shutdown")
def shutdown_event():
    """Stop background polling on shutdown"""
    global polling_active
    polling_active = False
    if polling_thread:
        polling_thread.join(timeout=5)
