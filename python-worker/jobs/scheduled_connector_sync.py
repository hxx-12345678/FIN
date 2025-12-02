"""
Scheduled Connector Sync Job Handler
Runs every 12 hours to check connectors and trigger syncs if needed
"""

import json
from datetime import datetime, timezone, timedelta
from utils.db import get_db_connection
from utils.logger import setup_logger
from jobs.runner import check_cancel_requested, mark_cancelled, update_progress

logger = setup_logger()


def handle_scheduled_connector_sync(job_id: str, org_id: str, object_id: str, logs: dict):
    """
    Handle scheduled connector sync job.
    Checks all connectors and triggers syncs if:
    - Auto-sync is enabled
    - Last sync is older than sync_frequency_hours
    """
    logger.info(f"Processing scheduled connector sync job {job_id}")
    
    conn = None
    cursor = None
    
    try:
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        update_progress(job_id, 10, {'status': 'checking_connectors'})
        
        # Get all connectors with auto-sync enabled
        cursor.execute("""
            SELECT id, "orgId", type, "lastSyncedAt", "syncFrequencyHours", "autoSyncEnabled"
            FROM connectors
            WHERE "autoSyncEnabled" = true
        """)
        
        connectors = cursor.fetchall()
        total_connectors = len(connectors)
        
        update_progress(job_id, 20, {'status': 'processing', 'total_connectors': total_connectors})
        
        synced_count = 0
        skipped_count = 0
        error_count = 0
        triggered_count = 0
        
        now = datetime.now(timezone.utc)
        
        for idx, (connector_id, org_id_val, connector_type, last_synced_at, sync_freq_hours, auto_sync_enabled) in enumerate(connectors):
            try:
                if check_cancel_requested(job_id):
                    mark_cancelled(job_id)
                    return
                
                # Check if sync is needed
                should_sync = False
                
                if not last_synced_at:
                    # Never synced, trigger sync
                    should_sync = True
                else:
                    # Check if last sync is older than sync frequency
                    sync_freq = sync_freq_hours or 24  # Default 24 hours
                    hours_since_sync = (now - last_synced_at).total_seconds() / 3600
                    
                    if hours_since_sync >= sync_freq:
                        should_sync = True
                
                if should_sync:
                    # Check if there's already a running sync job for this connector
                    cursor.execute("""
                        SELECT id FROM jobs
                        WHERE "jobType" = 'connector_sync'
                        AND "objectId" = %s
                        AND status IN ('queued', 'running')
                        LIMIT 1
                    """, (connector_id,))
                    
                    if cursor.fetchone():
                        skipped_count += 1
                        logger.debug(f"Connector {connector_id} already has sync job running, skipping")
                        continue
                    
                    # Create sync job - store params in logs JSONB field
                    sync_params = {
                        'triggerType': 'scheduled',
                        'triggerSource': job_id,
                        'connectorType': connector_type,
                    }
                    
                    sync_logs = [
                        {
                            'ts': datetime.now(timezone.utc).isoformat(),
                            'level': 'info',
                            'msg': 'Job created',
                            'meta': {
                                'jobType': 'connector_sync',
                                'queue': 'connectors',
                                'priority': 50,
                            }
                        },
                        {
                            'ts': datetime.now(timezone.utc).isoformat(),
                            'level': 'info',
                            'msg': 'Job parameters set',
                            'meta': {'params': sync_params}
                        }
                    ]
                    
                    cursor.execute("""
                        INSERT INTO jobs (id, job_type, "orgId", object_id, status, priority, queue, logs, created_at, updated_at)
                        VALUES (
                            gen_random_uuid(),
                            'connector_sync',
                            %s,
                            %s,
                            'queued',
                            50,
                            'connectors',
                            %s::jsonb,
                            NOW(),
                            NOW()
                        )
                    """, (
                        org_id_val,
                        connector_id,
                        json.dumps(sync_logs),
                    ))
                    
                    triggered_count += 1
                    logger.debug(f"Scheduled sync: Triggered for connector {connector_id} ({connector_type})")
                
                else:
                    skipped_count += 1
                
                # Update progress
                progress = 20 + int((idx + 1) / total_connectors * 70)
                update_progress(job_id, progress, {
                    'status': 'processing',
                    'processed': idx + 1,
                    'total': total_connectors,
                    'triggered': triggered_count,
                    'skipped': skipped_count,
                })
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error processing connector {connector_id}: {str(e)}", exc_info=True)
        
        conn.commit()
        
        stats = {
            'checked': total_connectors,
            'triggered': triggered_count,
            'skipped': skipped_count,
            'errors': error_count,
        }
        
        update_progress(job_id, 100, {
            'status': 'completed',
            **stats,
        })
        
        logger.info(f"✅ Scheduled connector sync completed: {triggered_count} triggered, {skipped_count} skipped, {error_count} errors")
        
    except Exception as e:
        logger.error(f"❌ Scheduled connector sync failed: {str(e)}", exc_info=True)
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


