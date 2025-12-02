"""
Scheduled Auto Model Job Handler
Runs every 6 hours to check for new data and trigger model runs
"""
import json
from datetime import datetime, timezone, timedelta
from utils.db import get_db_connection
from utils.logger import setup_logger
from jobs.runner import check_cancel_requested, mark_cancelled, update_progress

logger = setup_logger()


def handle_scheduled_auto_model(job_id: str, org_id: str, object_id: str, logs: dict):
    """
    Handle scheduled auto-model job.
    Checks all orgs for new data and triggers model runs if needed.
    """
    logger.info(f"Processing scheduled auto-model job {job_id}")
    
    conn = None
    cursor = None
    
    try:
        # Check for cancellation
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        update_progress(job_id, 10, {'status': 'checking_orgs'})
        
        # Get all orgs
        cursor.execute("""
            SELECT id FROM orgs
        """)
        
        orgs = cursor.fetchall()
        total_orgs = len(orgs)
        
        update_progress(job_id, 20, {'status': 'processing', 'total_orgs': total_orgs})
        
        triggered_count = 0
        skipped_count = 0
        error_count = 0
        
        for idx, (org_id_val,) in enumerate(orgs):
            try:
                # Check for cancellation
                if check_cancel_requested(job_id):
                    mark_cancelled(job_id)
                    return
                
                # Check if org has models
                cursor.execute("""
                    SELECT COUNT(*) FROM models WHERE "orgId" = %s
                """, (org_id_val,))
                
                model_count = cursor.fetchone()[0]
                if model_count == 0:
                    skipped_count += 1
                    continue
                
                # Check if there's already a running model run
                cursor.execute("""
                    SELECT id FROM model_runs
                    WHERE "orgId" = %s AND status IN ('queued', 'running')
                    LIMIT 1
                """, (org_id_val,))
                
                if cursor.fetchone():
                    skipped_count += 1
                    continue
                
                # Check last model run vs last transaction
                cursor.execute("""
                    SELECT created_at FROM model_runs
                    WHERE "orgId" = %s AND "run_type" = 'baseline'
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (org_id_val,))
                
                last_run = cursor.fetchone()
                
                cursor.execute("""
                    SELECT "importedAt" FROM raw_transactions
                    WHERE "orgId" = %s
                    ORDER BY "importedAt" DESC
                    LIMIT 1
                """, (org_id_val,))
                
                last_transaction = cursor.fetchone()
                
                # Determine if we should trigger
                should_trigger = False
                if not last_run:
                    # No model run exists, trigger if there are transactions
                    if last_transaction:
                        should_trigger = True
                elif last_transaction:
                    # Check if transactions are newer than last model run
                    if last_transaction[0] > last_run[0]:
                        # Also check time gap (at least 1 hour)
                        hours_since = (datetime.now(timezone.utc) - last_run[0]).total_seconds() / 3600
                        if hours_since >= 1:
                            should_trigger = True
                
                if should_trigger:
                    # Get primary model
                    cursor.execute("""
                        SELECT id FROM models
                        WHERE "orgId" = %s
                        ORDER BY created_at DESC
                        LIMIT 1
                    """, (org_id_val,))
                    
                    model_row = cursor.fetchone()
                    if model_row:
                        model_id = model_row[0]
                        
                        # Create auto-model trigger job - store params in logs JSONB field  
                        trigger_params = {
                            'triggerType': 'scheduled',
                            'triggerSource': job_id,
                        }
                        
                        trigger_logs = [
                            {
                                'ts': datetime.now(timezone.utc).isoformat(),
                                'level': 'info',
                                'msg': 'Job created',
                                'meta': {
                                    'jobType': 'auto_model_trigger',
                                    'queue': 'default',
                                    'priority': 45,
                                }
                            },
                            {
                                'ts': datetime.now(timezone.utc).isoformat(),
                                'level': 'info',
                                'msg': 'Job parameters set',
                                'meta': {'params': trigger_params}
                            }
                        ]
                        
                        cursor.execute("""
                            INSERT INTO jobs (id, job_type, "orgId", object_id, status, priority, queue, logs, created_at, updated_at)
                            VALUES (
                                gen_random_uuid(),
                                'auto_model_trigger',
                                %s,
                                %s,
                                'queued',
                                45,
                                'default',
                                %s::jsonb,
                                NOW(),
                                NOW()
                            )
                        """, (
                            org_id_val,
                            job_id,
                            json.dumps(trigger_logs),
                        ))
                        
                        triggered_count += 1
                        logger.debug(f"Auto-model: Triggered for org {org_id_val}")
                else:
                    skipped_count += 1
                
                # Update progress periodically
                if (idx + 1) % 10 == 0:
                    progress = 20 + int((idx + 1) / total_orgs * 70)
                    update_progress(job_id, progress, {
                        'status': 'processing',
                        'processed': idx + 1,
                        'total': total_orgs,
                        'triggered': triggered_count,
                        'skipped': skipped_count,
                    })
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error processing org {org_id_val}: {str(e)}")
                continue
        
        conn.commit()
        
        update_progress(job_id, 100, {
            'status': 'completed',
            'total_orgs': total_orgs,
            'triggered': triggered_count,
            'skipped': skipped_count,
            'errors': error_count,
        })
        
        logger.info(f"✅ Scheduled auto-model: Processed {total_orgs} orgs, triggered {triggered_count}, skipped {skipped_count}, errors {error_count}")
        
    except Exception as e:
        logger.error(f"❌ Scheduled auto-model failed: {str(e)}", exc_info=True)
        raise
    finally:
        if cursor:
            try:
                cursor.close()
            except:
                pass
        if conn:
            try:
                conn.close()
            except:
                pass


