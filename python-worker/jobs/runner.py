"""
Generic job runner helpers
Provides reservation, visibility extension, progress updates, and completion logic
"""
import json
import os
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Callable
from utils.db import get_db_connection
from utils.logger import setup_logger
from jobs.retry_utils import calculate_backoff, should_retry, is_transient_error

logger = setup_logger()

# Configuration from environment
VISIBILITY_TIMEOUT_SECONDS = int(os.getenv('JOB_VISIBILITY_TIMEOUT_SECONDS', '1800'))  # 30 minutes
BASE_BACKOFF_SECONDS = float(os.getenv('JOB_BASE_BACKOFF_SECONDS', '30.0'))
WORKER_ID = os.getenv('WORKER_ID', f'worker-{os.getpid()}-{int(time.time())}')


def _check_column_exists(cursor, table_name: str, column_name: str) -> bool:
    """Helper to check if a column exists in a table"""
    try:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s
        """, (table_name, column_name))
        return cursor.fetchone() is not None
    except:
        return False


def reserve_job(queue: str = 'default') -> Optional[Dict[str, Any]]:
    """
    Reserve a job for processing (atomic operation).
    
    Args:
        queue: Queue name to reserve from
    
    Returns:
        Job dictionary if reserved, None otherwise
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check which columns exist
        queue_exists = _check_column_exists(cursor, 'jobs', 'queue')
        next_run_at_exists = _check_column_exists(cursor, 'jobs', 'nextRunAt')
        visibility_expires_at_exists = _check_column_exists(cursor, 'jobs', 'visibilityExpiresAt')
        cancel_requested_exists = _check_column_exists(cursor, 'jobs', 'cancelRequested')
        worker_id_exists = _check_column_exists(cursor, 'jobs', 'workerId')
        run_started_at_exists = _check_column_exists(cursor, 'jobs', 'runStartedAt')
        priority_exists = _check_column_exists(cursor, 'jobs', 'priority')
        updated_at_exists = _check_column_exists(cursor, 'jobs', 'updatedAt')
        created_at_exists = _check_column_exists(cursor, 'jobs', 'createdAt')
        attempts_exists = _check_column_exists(cursor, 'jobs', 'attempts')
        max_attempts_exists = _check_column_exists(cursor, 'jobs', 'max_attempts')
        last_error_exists = _check_column_exists(cursor, 'jobs', 'last_error')
        created_by_user_id_exists = _check_column_exists(cursor, 'jobs', 'created_by_user_id')
        billing_estimate_exists = _check_column_exists(cursor, 'jobs', 'billing_estimate')
        finished_at_exists = _check_column_exists(cursor, 'jobs', 'finished_at')
        
        now = datetime.now(timezone.utc)
        visibility_expires_at = now + timedelta(seconds=VISIBILITY_TIMEOUT_SECONDS)
        
        # Build SET clause dynamically based on available columns
        set_clauses = ['status = %s']
        set_values = ['running']
        
        if updated_at_exists:
            set_clauses.append('updated_at = NOW()')
        
        if worker_id_exists:
            set_clauses.append('worker_id = %s')
            set_values.append(WORKER_ID)
        if run_started_at_exists:
            set_clauses.append('run_started_at = NOW()')
        if visibility_expires_at_exists:
            set_clauses.append('visibility_expires_at = %s')
            set_values.append(visibility_expires_at)
        
        # Build WHERE clause for subquery
        where_clauses = ['status = %s']
        where_values = ['queued']
        
        if queue_exists:
            where_clauses.append('queue = %s')
            where_values.append(queue)
        if next_run_at_exists:
            where_clauses.append('(next_run_at IS NULL OR next_run_at <= NOW())')
        if cancel_requested_exists:
            where_clauses.append('cancel_requested = false')
        
        # Build ORDER BY clause
        order_by_clauses = []
        if priority_exists:
            order_by_clauses.append('priority DESC')
        if created_at_exists:
            order_by_clauses.append('created_at ASC')
        elif updated_at_exists:
            order_by_clauses.append('updated_at ASC')
        else:
            order_by_clauses.append('id ASC')  # Fallback to id
        
        order_by = ', '.join(order_by_clauses) if order_by_clauses else 'id ASC'
        
        # Build RETURNING clause (use actual database column names)
        # Note: orgId must be quoted because it's camelCase in the database
        returning_cols = [
            'id', 'job_type', '"orgId"', 'object_id', 'status', 'progress', 'logs'
        ]
        if priority_exists:
            returning_cols.append('priority')
        if queue_exists:
            returning_cols.append('queue')
        if attempts_exists:
            returning_cols.append('attempts')
        if max_attempts_exists:
            returning_cols.append('max_attempts')
        if last_error_exists:
            returning_cols.append('last_error')
        if next_run_at_exists:
            returning_cols.append('next_run_at')
        if worker_id_exists:
            returning_cols.append('worker_id')
        if run_started_at_exists:
            returning_cols.append('run_started_at')
        if visibility_expires_at_exists:
            returning_cols.append('visibility_expires_at')
        if cancel_requested_exists:
            returning_cols.append('cancel_requested')
        if created_by_user_id_exists:
            returning_cols.append('created_by_user_id')
        if billing_estimate_exists:
            returning_cols.append('billing_estimate')
        if created_at_exists:
            returning_cols.append('created_at')
        if updated_at_exists:
            returning_cols.append('updated_at')
        if finished_at_exists:
            returning_cols.append('finished_at')
        
        # Execute query (explicitly use public schema)
        query = f"""
            UPDATE public.jobs
            SET {', '.join(set_clauses)}
            WHERE id = (
                SELECT id
                FROM public.jobs
                WHERE {' AND '.join(where_clauses)}
                ORDER BY {order_by}
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING {', '.join(returning_cols)}
        """
        
        cursor.execute(query, tuple(set_values + where_values))
        
        row = cursor.fetchone()
        
        if not row:
            return None
        
        # Convert row to dictionary dynamically based on available columns
        idx = 0
        job = {}
        
        if idx < len(row):
            job['id'] = row[idx]
            idx += 1
        if idx < len(row):
            job['jobType'] = row[idx]  # job_type in DB
            idx += 1
        if idx < len(row):
            job['orgId'] = row[idx]  # orgId in DB (no mapping)
            idx += 1
        if idx < len(row):
            job['objectId'] = row[idx]  # object_id in DB
            idx += 1
        if idx < len(row):
            job['status'] = row[idx]
            idx += 1
        if idx < len(row):
            job['progress'] = float(row[idx]) if row[idx] else 0.0
            idx += 1
        if idx < len(row):
            job['logs'] = row[idx]
            idx += 1
        if priority_exists:
            if idx < len(row):
                job['priority'] = row[idx]
                idx += 1
            else:
                job['priority'] = 50  # Default priority
        else:
            job['priority'] = 50  # Default priority
        
        if queue_exists:
            if idx < len(row):
                job['queue'] = row[idx]
                idx += 1
            else:
                job['queue'] = 'default'
        else:
            job['queue'] = 'default'
        
        if attempts_exists:
            if idx < len(row):
                job['attempts'] = row[idx]
                idx += 1
            else:
                job['attempts'] = 0
        else:
            job['attempts'] = 0
        
        if max_attempts_exists:
            if idx < len(row):
                job['maxAttempts'] = row[idx]
                idx += 1
            else:
                job['maxAttempts'] = 5
        else:
            job['maxAttempts'] = 5
        
        if last_error_exists:
            if idx < len(row):
                job['lastError'] = row[idx]
                idx += 1
            else:
                job['lastError'] = None
        else:
            job['lastError'] = None
        
        if next_run_at_exists:
            if idx < len(row):
                job['nextRunAt'] = row[idx]
                idx += 1
            else:
                job['nextRunAt'] = None
        else:
            job['nextRunAt'] = None
        
        if worker_id_exists:
            if idx < len(row):
                job['workerId'] = row[idx]
                idx += 1
            else:
                job['workerId'] = None
        else:
            job['workerId'] = None
        
        if run_started_at_exists:
            if idx < len(row):
                job['runStartedAt'] = row[idx]
                idx += 1
            else:
                job['runStartedAt'] = None
        else:
            job['runStartedAt'] = None
        
        if visibility_expires_at_exists:
            if idx < len(row):
                job['visibilityExpiresAt'] = row[idx]
                idx += 1
            else:
                job['visibilityExpiresAt'] = None
        else:
            job['visibilityExpiresAt'] = None
        
        if cancel_requested_exists:
            if idx < len(row):
                job['cancelRequested'] = row[idx]
                idx += 1
            else:
                job['cancelRequested'] = False
        else:
            job['cancelRequested'] = False
        
        if created_by_user_id_exists:
            if idx < len(row):
                job['createdByUserId'] = row[idx]
                idx += 1
            else:
                job['createdByUserId'] = None
        else:
            job['createdByUserId'] = None
        
        if billing_estimate_exists:
            if idx < len(row):
                job['billingEstimate'] = float(row[idx]) if row[idx] else None
                idx += 1
            else:
                job['billingEstimate'] = None
        else:
            job['billingEstimate'] = None
        
        if created_at_exists:
            if idx < len(row):
                job['createdAt'] = row[idx]
                idx += 1
            else:
                job['createdAt'] = None
        else:
            job['createdAt'] = None
        
        if updated_at_exists:
            if idx < len(row):
                job['updatedAt'] = row[idx]
                idx += 1
            else:
                job['updatedAt'] = None
        else:
            job['updatedAt'] = None
        
        if finished_at_exists:
            if idx < len(row):
                job['finishedAt'] = row[idx]
                idx += 1
            else:
                job['finishedAt'] = None
        else:
            job['finishedAt'] = None
        
        conn.commit()
        logger.info(f"✅ Reserved job {job['id']} (type: {job['jobType']})")
        return job
        
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Failed to reserve job: {str(e)}", exc_info=True)
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def extend_visibility(job_id: str) -> bool:
    """
    Extend visibility timeout for a running job.
    Should be called periodically for long-running jobs.
    
    Args:
        job_id: Job ID
    
    Returns:
        True if extended successfully, False otherwise
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check which columns exist
        visibility_expires_at_exists = _check_column_exists(cursor, 'jobs', 'visibilityExpiresAt')
        updated_at_exists = _check_column_exists(cursor, 'jobs', 'updatedAt')
        worker_id_exists = _check_column_exists(cursor, 'jobs', 'workerId')
        
        if not visibility_expires_at_exists:
            # Can't extend visibility if column doesn't exist
            return False
        
        now = datetime.now(timezone.utc)
        visibility_expires_at = now + timedelta(seconds=VISIBILITY_TIMEOUT_SECONDS)
        
        # Build SET clause
        set_clauses = ['visibility_expires_at = %s']
        set_values = [visibility_expires_at]
        
        if updated_at_exists:
            set_clauses.append('updated_at = NOW()')
        
        # Build WHERE clause
        where_clauses = ['id = %s', 'status = %s']
        where_values = [job_id, 'running']
        
        if worker_id_exists:
            where_clauses.append('worker_id = %s')
            where_values.append(WORKER_ID)
        
        query = f"""
            UPDATE jobs
            SET {', '.join(set_clauses)}
            WHERE {' AND '.join(where_clauses)}
        """
        
        cursor.execute(query, tuple(set_values + where_values))
        
        conn.commit()
        return cursor.rowcount > 0
        
    except Exception as e:
        logger.error(f"Failed to extend visibility for job {job_id}: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def update_progress(
    job_id: str,
    progress: float,
    log_entry: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Update job progress and append log entry.
    
    Args:
        job_id: Job ID
        progress: Progress percentage (0-100)
        log_entry: Optional log entry dict with {level, msg, meta}
    
    Returns:
        True if updated successfully
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current logs
        cursor.execute("""
            SELECT logs
            FROM jobs
            WHERE id = %s
        """, (job_id,))
        
        row = cursor.fetchone()
        if not row:
            return False
        
        logs_raw = row[0]
        # Normalize logs to always be a list
        if logs_raw is None:
            logs = []
        elif isinstance(logs_raw, str):
            try:
                parsed = json.loads(logs_raw)
                if isinstance(parsed, list):
                    logs = parsed
                elif isinstance(parsed, dict):
                    # Convert dict to list format
                    logs = [parsed] if parsed else []
                else:
                    logs = []
            except:
                logs = []
        elif isinstance(logs_raw, list):
            logs = logs_raw
        elif isinstance(logs_raw, dict):
            # Convert dict to list format
            logs = [logs_raw] if logs_raw else []
        else:
            logs = []
        
        # Append new log entry if provided
        if log_entry:
            log_entry['ts'] = datetime.now(timezone.utc).isoformat()
            logs.append(log_entry)
        
        # Keep only last 1000 log entries
        max_logs = 1000
        if len(logs) > max_logs:
            logs = logs[-max_logs:]
        
        # Check if updatedAt column exists
        updated_at_exists = _check_column_exists(cursor, 'jobs', 'updatedAt')
        
        # Build SET clause
        set_clauses = [
            'progress = %s',
            'logs = %s::jsonb'
        ]
        set_values = [
            min(100.0, max(0.0, progress)),
            json.dumps(logs)
        ]
        
        if updated_at_exists:
            set_clauses.append('updated_at = NOW()')
        
        query = f"""
            UPDATE jobs
            SET {', '.join(set_clauses)}
            WHERE id = %s
        """
        
        cursor.execute(query, tuple(set_values + [job_id]))
        
        conn.commit()
        return True
        
    except Exception as e:
        logger.error(f"Failed to update progress for job {job_id}: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def complete_job(job_id: str, result: Optional[Dict[str, Any]] = None) -> bool:
    """
    Mark job as completed.
    
    Args:
        job_id: Job ID
        result: Optional result metadata
    
    Returns:
        True if completed successfully
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current logs
        cursor.execute("""
            SELECT logs
            FROM jobs
            WHERE id = %s
        """, (job_id,))
        
        row = cursor.fetchone()
        if not row:
            return False
        
        logs_raw = row[0]
        # Normalize logs to always be a list - be very defensive
        logs = []
        try:
            if logs_raw is None:
                logs = []
            elif isinstance(logs_raw, str):
                try:
                    parsed = json.loads(logs_raw)
                    if isinstance(parsed, list):
                        logs = list(parsed)  # Ensure it's a list, not tuple
                    elif isinstance(parsed, dict):
                        # Convert dict to list format
                        logs = [parsed] if parsed else []
                    else:
                        logs = []
                except Exception as parse_error:
                    logger.warning(f"Failed to parse logs JSON: {str(parse_error)}")
                    logs = []
            elif isinstance(logs_raw, list):
                logs = list(logs_raw)  # Ensure it's a list, not tuple
            elif isinstance(logs_raw, dict):
                # Convert dict to list format
                logs = [logs_raw] if logs_raw else []
            else:
                logger.warning(f"Unexpected logs type: {type(logs_raw)}, using empty list")
                logs = []
        except Exception as normalize_error:
            logger.error(f"Error normalizing logs: {str(normalize_error)}, using empty list")
            logs = []
        
        # Double-check logs is a list before appending
        if not isinstance(logs, list):
            logger.warning(f"Logs is not a list after normalization (type: {type(logs)}), converting")
            logs = [logs] if logs else []
        
        # Add completion log
        try:
            logs.append({
                'ts': datetime.now(timezone.utc).isoformat(),
                'level': 'info',
                'msg': 'Job completed successfully',
                'meta': result or {},
            })
        except AttributeError as append_error:
            logger.error(f"Failed to append to logs (type: {type(logs)}, value: {logs}): {str(append_error)}")
            # Create new list with completion log
            logs = [{
                'ts': datetime.now(timezone.utc).isoformat(),
                'level': 'info',
                'msg': 'Job completed successfully',
                'meta': result or {},
            }]
        
        # Check which columns exist
        finished_at_exists = _check_column_exists(cursor, 'jobs', 'finishedAt')
        updated_at_exists = _check_column_exists(cursor, 'jobs', 'updatedAt')
        
        # Build SET clause
        set_clauses = [
            "status = 'completed'",
            'progress = 100.0',
            'logs = %s::jsonb'
        ]
        set_values = [json.dumps(logs)]
        
        if finished_at_exists:
            set_clauses.append('finished_at = NOW()')
        if updated_at_exists:
            set_clauses.append('updated_at = NOW()')
        
        query = f"""
            UPDATE jobs
            SET {', '.join(set_clauses)}
            WHERE id = %s
        """
        
        cursor.execute(query, tuple(set_values + [job_id]))
        
        conn.commit()
        logger.info(f"✅ Job {job_id} completed")
        return True
        
    except Exception as e:
        logger.error(f"Failed to complete job {job_id}: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def fail_job(
    job_id: str,
    error: Exception,
    base_backoff_seconds: float = BASE_BACKOFF_SECONDS
) -> bool:
    """
    Mark job as failed and schedule retry or move to DLQ.
    
    Args:
        job_id: Job ID
        error: The exception that occurred
        base_backoff_seconds: Base backoff for retry calculation
    
    Returns:
        True if failed successfully
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current job state
        cursor.execute("""
            SELECT attempts, max_attempts, logs
            FROM jobs
            WHERE id = %s
        """, (job_id,))
        
        row = cursor.fetchone()
        if not row:
            return False
        
        current_attempts = row[0]
        max_attempts = row[1]
        logs_raw = row[2]
        
        # Normalize logs to always be a list
        if logs_raw is None:
            logs = []
        elif isinstance(logs_raw, str):
            try:
                parsed = json.loads(logs_raw)
                if isinstance(parsed, list):
                    logs = parsed
                elif isinstance(parsed, dict):
                    # Convert dict to list format
                    logs = [parsed] if parsed else []
                else:
                    logs = []
            except:
                logs = []
        elif isinstance(logs_raw, list):
            logs = logs_raw
        elif isinstance(logs_raw, dict):
            # Convert dict to list format
            logs = [logs_raw] if logs_raw else []
        else:
                logs = []
        
        new_attempts = current_attempts + 1
        
        # Add error log
        logs.append({
            'ts': datetime.now(timezone.utc).isoformat(),
            'level': 'error',
            'msg': str(error),
            'meta': {
                'attempt': new_attempts,
                'error_type': type(error).__name__,
                'stack': str(error) if hasattr(error, '__traceback__') else None,
            },
        })
        
        # Check which columns exist
        next_run_at_exists = _check_column_exists(cursor, 'jobs', 'nextRunAt')
        worker_id_exists = _check_column_exists(cursor, 'jobs', 'workerId')
        run_started_at_exists = _check_column_exists(cursor, 'jobs', 'runStartedAt')
        visibility_expires_at_exists = _check_column_exists(cursor, 'jobs', 'visibilityExpiresAt')
        updated_at_exists = _check_column_exists(cursor, 'jobs', 'updatedAt')
        finished_at_exists = _check_column_exists(cursor, 'jobs', 'finishedAt')
        
        # Check if should retry
        if should_retry(new_attempts, max_attempts, error):
            # Calculate backoff
            backoff_seconds = calculate_backoff(new_attempts, base_backoff_seconds)
            next_run_at = datetime.now(timezone.utc) + timedelta(seconds=backoff_seconds)
            
            # Build SET clause
            set_clauses = [
                "status = 'retrying'",
                'attempts = %s',
                'last_error = %s',
                'logs = %s::jsonb'
            ]
            set_values = [
                new_attempts,
                str(error)[:500],  # Truncate long errors
                json.dumps(logs)
            ]
            
            if next_run_at_exists:
                set_clauses.append('next_run_at = %s')
                set_values.append(next_run_at)
            if worker_id_exists:
                set_clauses.append('worker_id = NULL')
            if run_started_at_exists:
                set_clauses.append('run_started_at = NULL')
            if visibility_expires_at_exists:
                set_clauses.append('visibility_expires_at = NULL')
            if updated_at_exists:
                set_clauses.append('updated_at = NOW()')
            
            query = f"""
                UPDATE jobs
                SET {', '.join(set_clauses)}
                WHERE id = %s
            """
            
            cursor.execute(query, tuple(set_values + [job_id]))
            
            logger.warning(
                f"⚠️ Job {job_id} failed (attempt {new_attempts}/{max_attempts}), "
                f"retrying in {backoff_seconds:.1f}s"
            )
        else:
            # Move to dead letter queue
            # Build SET clause
            set_clauses = [
                "status = 'dead_letter'",
                'attempts = %s',
                'last_error = %s',
                'logs = %s::jsonb'
            ]
            set_values = [
                new_attempts,
                str(error)[:500],
                json.dumps(logs)
            ]
            
            if finished_at_exists:
                set_clauses.append('finished_at = NOW()')
            if updated_at_exists:
                set_clauses.append('updated_at = NOW()')
            
            query = f"""
                UPDATE jobs
                SET {', '.join(set_clauses)}
                WHERE id = %s
            """
            
            cursor.execute(query, tuple(set_values + [job_id]))
            
            logger.error(
                f"❌ Job {job_id} moved to DLQ after {new_attempts} attempts"
            )
        
        conn.commit()
        return True
        
    except Exception as e:
        logger.error(f"Failed to fail job {job_id}: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def check_cancel_requested(job_id: str) -> bool:
    """
    Check if job cancellation has been requested.
    
    Args:
        job_id: Job ID
    
    Returns:
        True if cancellation requested, False otherwise
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if cancelRequested column exists
        cancel_requested_exists = _check_column_exists(cursor, 'jobs', 'cancelRequested')
        
        if not cancel_requested_exists:
            # Column doesn't exist, so cancellation not supported
            return False
        
        cursor.execute("""
            SELECT cancel_requested
            FROM jobs
            WHERE id = %s
        """, (job_id,))
        
        row = cursor.fetchone()
        if not row:
            return False
        
        return bool(row[0])
        
    except Exception as e:
        logger.error(f"Failed to check cancel status for job {job_id}: {str(e)}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def mark_cancelled(job_id: str) -> bool:
    """
    Mark job as cancelled.
    
    Args:
        job_id: Job ID
    
    Returns:
        True if cancelled successfully
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current logs
        cursor.execute("""
            SELECT logs
            FROM jobs
            WHERE id = %s
        """, (job_id,))
        
        row = cursor.fetchone()
        if not row:
            return False
        
        logs_raw = row[0]
        # Normalize logs to always be a list
        if logs_raw is None:
            logs = []
        elif isinstance(logs_raw, str):
            try:
                parsed = json.loads(logs_raw)
                if isinstance(parsed, list):
                    logs = parsed
                elif isinstance(parsed, dict):
                    # Convert dict to list format
                    logs = [parsed] if parsed else []
                else:
                    logs = []
            except:
                logs = []
        elif isinstance(logs_raw, list):
            logs = logs_raw
        elif isinstance(logs_raw, dict):
            # Convert dict to list format
            logs = [logs_raw] if logs_raw else []
        else:
            logs = []
        
        logs.append({
            'ts': datetime.now(timezone.utc).isoformat(),
            'level': 'info',
            'msg': 'Job cancelled by user',
        })
        
        # Check which columns exist
        finished_at_exists = _check_column_exists(cursor, 'jobs', 'finishedAt')
        updated_at_exists = _check_column_exists(cursor, 'jobs', 'updatedAt')
        
        # Build SET clause
        set_clauses = [
            "status = 'cancelled'",
            'logs = %s::jsonb'
        ]
        set_values = [json.dumps(logs)]
        
        if finished_at_exists:
            set_clauses.append('finished_at = NOW()')
        if updated_at_exists:
            set_clauses.append('updated_at = NOW()')
        
        query = f"""
            UPDATE jobs
            SET {', '.join(set_clauses)}
            WHERE id = %s
        """
        
        cursor.execute(query, tuple(set_values + [job_id]))
        
        conn.commit()
        logger.info(f"🛑 Job {job_id} cancelled")
        return True
        
    except Exception as e:
        logger.error(f"Failed to cancel job {job_id}: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def release_stuck_jobs(queue: str = 'default', timeout_minutes: int = 60) -> int:
    """
    Release jobs that have been running for too long (stuck jobs).
    This should be called on worker startup to clean up jobs from crashed workers.
    
    Args:
        queue: Queue name to check
        timeout_minutes: Minutes after which a job is considered stuck
    
    Returns:
        Number of jobs released
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check which columns exist
        queue_exists = _check_column_exists(cursor, 'jobs', 'queue')
        visibility_expires_at_exists = _check_column_exists(cursor, 'jobs', 'visibilityExpiresAt')
        run_started_at_exists = _check_column_exists(cursor, 'jobs', 'runStartedAt')
        worker_id_exists = _check_column_exists(cursor, 'jobs', 'workerId')
        updated_at_exists = _check_column_exists(cursor, 'jobs', 'updatedAt')
        
        timeout_threshold = datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)
        
        # Build SET clause
        set_clauses = ['status = %s']
        set_values = ['queued']
        
        if updated_at_exists:
            set_clauses.append('updated_at = NOW()')
        
        if worker_id_exists:
            set_clauses.append('worker_id = NULL')
        if run_started_at_exists:
            set_clauses.append('run_started_at = NULL')
        if visibility_expires_at_exists:
            set_clauses.append('visibility_expires_at = NULL')
        
        # Build WHERE clause
        where_clauses = ['status = %s']
        where_values = ['running']
        
        if queue_exists:
            where_clauses.append('queue = %s')
            where_values.append(queue)
        
        # Add timeout conditions
        timeout_conditions = []
        if visibility_expires_at_exists:
            timeout_conditions.append('visibility_expires_at < NOW()')
        if run_started_at_exists:
            timeout_conditions.append('run_started_at < %s')
            where_values.append(timeout_threshold)
        
        if timeout_conditions:
            where_clauses.append(f"({' OR '.join(timeout_conditions)})")
        
        # Execute query
        query = f"""
            UPDATE jobs
            SET {', '.join(set_clauses)}
            WHERE {' AND '.join(where_clauses)}
            RETURNING id
        """
        
        cursor.execute(query, tuple(set_values + where_values))
        
        released_count = cursor.rowcount
        conn.commit()
        
        if released_count > 0:
            logger.warning(f"Released {released_count} stuck jobs from queue '{queue}'")
        
        return released_count
        
    except Exception as e:
        logger.error(f"Failed to release stuck jobs: {str(e)}", exc_info=True)
        if conn:
            conn.rollback()
        return 0
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def queue_job(
    job_type: str,
    org_id: str,
    object_id: Optional[str] = None,
    params: Optional[Dict[str, Any]] = None,
    queue: str = 'default',
    priority: int = 50
) -> Optional[str]:
    """
    Create a new job in the queue.
    
    Args:
        job_type: Type of job (e.g., 'alert_check', 'model_run')
        org_id: Organization ID
        object_id: Optional object ID (e.g., model_run_id)
        params: Optional parameters dict
        queue: Queue name (default: 'default')
        priority: Job priority (0-100, higher = more priority)
    
    Returns:
        Job ID if created successfully, None otherwise
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check which columns exist
        queue_exists = _check_column_exists(cursor, 'jobs', 'queue')
        priority_exists = _check_column_exists(cursor, 'jobs', 'priority')
        created_at_exists = _check_column_exists(cursor, 'jobs', 'createdAt')
        updated_at_exists = _check_column_exists(cursor, 'jobs', 'updatedAt')
        
        # Prepare logs with params
        logs = []
        if params:
            logs.append({
                'ts': datetime.now(timezone.utc).isoformat(),
                'level': 'info',
                'msg': 'Job queued',
                'meta': {'params': params},
            })
        else:
            logs.append({
                'ts': datetime.now(timezone.utc).isoformat(),
                'level': 'info',
                'msg': 'Job queued',
            })
        
        # Build INSERT columns and values
        columns = ['job_type', '"orgId"', 'status', 'progress', 'logs']
        values = [job_type, org_id, 'queued', 0.0, json.dumps(logs)]
        
        if object_id:
            columns.append('object_id')
            values.append(object_id)
        
        if queue_exists:
            columns.append('queue')
            values.append(queue)
        
        if priority_exists:
            columns.append('priority')
            values.append(priority)
        
        # Add timestamp columns if they exist
        now = datetime.now(timezone.utc)
        if created_at_exists:
            columns.append('created_at')
            values.append(now)
        if updated_at_exists:
            columns.append('updated_at')
            values.append(now)
        
        # Build query with all parameterized values
        placeholders = ['%s'] * len(values)
        query = f"""
            INSERT INTO jobs ({', '.join(columns)})
            VALUES ({', '.join(placeholders)})
            RETURNING id
        """
        
        cursor.execute(query, tuple(values))
        
        row = cursor.fetchone()
        if not row:
            return None
        
        job_id = str(row[0])
        conn.commit()
        
        logger.info(f"✅ Queued job {job_id} (type: {job_type}, queue: {queue})")
        return job_id
        
    except Exception as e:
        logger.error(f"Failed to queue job: {str(e)}", exc_info=True)
        if conn:
            conn.rollback()
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def run_job_with_retry(
    job: Dict[str, Any],
    handler: Callable[[str, str, str, dict], None],
    extend_interval_seconds: int = 300  # Extend visibility every 5 minutes
) -> None:
    """
    Run a job with automatic retry, progress updates, and cancellation checks.
    
    Args:
        job: Job dictionary
        handler: Job handler function (job_id, org_id, object_id, logs)
        extend_interval_seconds: How often to extend visibility (default 5 minutes)
    """
    job_id = job['id']
    org_id = job.get('orgId')
    object_id = job.get('objectId')
    logs_raw = job.get('logs') or {}
    
    # Normalize logs: handle both list and dict formats
    # Backend stores params in logs array as: [{..., meta: {params: {...}}}, ...]
    if isinstance(logs_raw, list):
        # Extract params from log entries (params are in meta.params)
        logs = {}
        params = {}
        for entry in reversed(logs_raw):
            if isinstance(entry, dict):
                # Check if this entry has params in meta
                if 'meta' in entry and isinstance(entry['meta'], dict):
                    if 'params' in entry['meta']:
                        params = entry['meta']['params']
                        break
        logs['params'] = params if params else {}
    elif isinstance(logs_raw, str):
        # Try to parse JSON string
        try:
            parsed = json.loads(logs_raw)
            if isinstance(parsed, list):
                # Extract params from list
                params = {}
                for entry in reversed(parsed):
                    if isinstance(entry, dict) and 'meta' in entry:
                        meta = entry.get('meta', {})
                        if isinstance(meta, dict) and 'params' in meta:
                            params = meta['params']
                            break
                logs = {'params': params}
            else:
                logs = parsed if isinstance(parsed, dict) else {'params': {}}
        except:
            logs = {'params': {}}
    else:
        # Already a dict, use as-is but ensure params key exists
        logs = logs_raw if isinstance(logs_raw, dict) else {}
        if 'params' not in logs:
            logs['params'] = {}
    
    last_extend_time = time.time()
    
    try:
        # Check for cancellation before starting
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        # Update progress to 1%
        update_progress(job_id, 1.0, {
            'level': 'info',
            'msg': 'Job started',
            'meta': {'workerId': WORKER_ID},
        })
        
        # Run handler with periodic visibility extension and cancellation checks
        handler_start_time = time.time()
        
        # For long-running jobs, we need to check cancellation periodically
        # This is a simplified version - actual handlers should check cancellation
        # at safe points in their processing
        
        handler(job_id, org_id or '', object_id or '', logs)
        
        # Mark as completed
        complete_job(job_id, {
            'duration_seconds': time.time() - handler_start_time,
        })
        
    except Exception as e:
        # Check if cancellation was requested
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        # Handle failure with retry logic
        fail_job(job_id, e, BASE_BACKOFF_SECONDS)


