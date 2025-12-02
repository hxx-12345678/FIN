"""
Data Sync Job Handler - Scheduled sync triggers (stub)
In production, this would handle scheduled data synchronization from connectors
"""
import json
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.logger import setup_logger
from jobs.runner import check_cancel_requested, mark_cancelled, update_progress

logger = setup_logger()


def handle_data_sync(job_id: str, org_id: str, object_id: str, logs: dict):
    """
    Handle scheduled data sync job (stub implementation).
    
    In production, this would:
    1. Check connector sync schedules
    2. Trigger connector sync jobs
    3. Handle incremental vs full syncs
    4. Update sync status and logs
    """
    logger.info(f"Processing data sync job {job_id}")
    
    conn = None
    cursor = None
    
    try:
        # Check for cancellation
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get sync parameters
        params = logs.get('params', {})
        connector_id = params.get('connectorId') or object_id
        sync_type = params.get('syncType', 'incremental')  # incremental | full
        
        update_progress(job_id, 10, {'status': 'checking_connectors'})
        
        # Stub: Check for connectors that need syncing
        # In production, this would query connectors table for scheduled syncs
        cursor.execute("""
            SELECT id, type, "syncStatus", "lastSyncAt"
            FROM connectors
            WHERE "orgId" = %s
              AND enabled = true
              AND (
                  "lastSyncAt" IS NULL
                  OR "lastSyncAt" < NOW() - INTERVAL '1 hour'
              )
            LIMIT 10
        """, (org_id,))
        
        connectors = cursor.fetchall()
        
        if not connectors:
            logger.info(f"No connectors need syncing for org {org_id}")
            update_progress(job_id, 100, {'status': 'completed', 'synced_count': 0})
            conn.commit()
            return
        
        update_progress(job_id, 30, {'status': 'syncing', 'connector_count': len(connectors)})
        
        # Stub: In production, this would create sync jobs for each connector
        # For now, just update sync status
        synced_count = 0
        for connector_row in connectors:
            connector_id_val = connector_row[0]
            connector_type = connector_row[1]
            
            # Check for cancellation during sync
            if check_cancel_requested(job_id):
                mark_cancelled(job_id)
                return
            
            try:
                # Update connector sync status
                cursor.execute("""
                    UPDATE connectors
                    SET "syncStatus" = 'syncing',
                        "lastSyncAt" = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                """, (connector_id_val,))
                
                # Stub: In production, would trigger actual sync here
                # For now, just mark as done
                cursor.execute("""
                    UPDATE connectors
                    SET "syncStatus" = 'done',
                        updated_at = NOW()
                    WHERE id = %s
                """, (connector_id_val,))
                
                synced_count += 1
                logger.debug(f"Synced connector {connector_id_val} ({connector_type})")
                
            except Exception as e:
                logger.error(f"Error syncing connector {connector_id_val}: {str(e)}")
                # Mark connector as failed
                try:
                    cursor.execute("""
                        UPDATE connectors
                        SET "syncStatus" = 'failed',
                            updated_at = NOW()
                        WHERE id = %s
                    """, (connector_id_val,))
                except:
                    pass
        
        update_progress(job_id, 100, {
            'status': 'completed',
            'synced_count': synced_count,
            'total_connectors': len(connectors),
        })
        conn.commit()
        
        logger.info(f"✅ Data sync completed: {synced_count}/{len(connectors)} connectors synced")
        
        # Trigger auto-model run if connectors were synced
        if synced_count > 0:
            try:
                logger.info(f"Auto-model: Triggering auto-model after connector sync ({synced_count} connectors synced)")
                # Create auto-model trigger job
                # Store params in logs JSONB field, not as separate column
                from datetime import datetime, timezone
                trigger_params = {
                    'triggerType': 'connector_sync',
                    'triggerSource': job_id,
                    'syncedCount': synced_count,
                }
                
                # Create logs array with params in meta
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
                    org_id,
                    job_id,  # Use data sync job ID as trigger source
                    json.dumps(trigger_logs),
                ))
                conn.commit()
                logger.info(f"Auto-model trigger job created after connector sync")
            except Exception as e:
                logger.warning(f"Failed to create auto-model trigger after connector sync: {str(e)}")
                # Don't fail the sync if auto-model trigger fails
        
    except Exception as e:
        logger.error(f"❌ Data sync failed: {str(e)}", exc_info=True)
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

