"""
Connector Sync Job Handler

Executes connector sync jobs from the message queue.
Called by python-worker when a 'connector_sync' job is dequeued.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from connectors import get_connector_class, CONNECTOR_REGISTRY
from utils.db import get_db_connection
from utils.logger import setup_logger


logger = setup_logger()


async def handle_connector_sync(
    job_id: str,
    org_id: str,
    object_id: str,  # connector_id
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Execute a connector sync job.
    
    This is called by the python worker when a connector_sync job is dequeued
    from the job queue. It:
    1. Loads connector configuration from database
    2. Instantiates the appropriate connector class
    3. Executes sync
    4. Stores results back to database
    5. Updates connector last_synced_at timestamp
    
    Args:
        job_id: Unique job identifier
        org_id: Organization ID
        object_id: Connector ID (in connectors table)
        params: Additional parameters like sync type, date range
    
    Returns:
        Dictionary with sync results
    """
    
    db = None
    connector = None
    
    try:
        logger.info(
            f"🔄 Starting connector sync job. "
            f"Job: {job_id}, Org: {org_id}, Connector: {object_id}"
        )
        
        params = params or {}
        connector_type = params.get('type')
        
        # Step 1: Load connector from database
        db = get_db_connection()
        connector_record = await _load_connector(db, org_id, object_id)
        
        if not connector_record:
            error_msg = f"Connector {object_id} not found for org {org_id}"
            logger.error(f"❌ {error_msg}")
            await _update_job_status(db, job_id, 'failed', {'error': error_msg})
            return {
                'success': False,
                'error': error_msg,
                'job_id': job_id,
            }
        
        # Extract connector metadata
        connector_type = connector_record['type'].lower()
        encrypted_config = connector_record['encrypted_config']
        config_json = connector_record['config_json'] or {}
        
        # Step 2: Decrypt config
        decrypted_config = await _decrypt_config(encrypted_config, config_json)
        
        # Step 3: Get connector class and instantiate
        try:
            ConnectorClass = get_connector_class(connector_type)
        except ValueError as e:
            error_msg = str(e)
            logger.error(f"❌ {error_msg}")
            await _update_job_status(db, job_id, 'failed', {'error': error_msg})
            return {
                'success': False,
                'error': error_msg,
                'job_id': job_id,
            }
        
        # Instantiate connector
        connector = ConnectorClass(
            org_id=org_id,
            connector_id=object_id,
            encrypted_config=decrypted_config,
        )
        
        # Step 4: Execute sync
        logger.info(
            f"⚙️  Executing {connector_type} sync for org {org_id}. "
            f"Trace: {connector.trace_id}"
        )
        
        sync_result = await connector.sync()
        
        # Step 5: Store results to database
        await _store_sync_results(
            db,
            org_id,
            object_id,
            connector_type,
            sync_result,
        )
        
        # Step 6: Update job status
        job_result = sync_result.to_dict()
        await _update_job_status(db, job_id, 'completed', job_result)
        
        logger.info(
            f"✅ Connector sync completed for {connector_type}. "
            f"Inserted: {sync_result.total_records_inserted}, "
            f"Updated: {sync_result.total_records_updated}, "
            f"Skipped: {sync_result.total_records_skipped}. "
            f"Trace: {connector.trace_id}"
        )
        
        return {
            'success': True,
            'job_id': job_id,
            'result': job_result,
        }
        
    except Exception as e:
        logger.error(f"❌ Connector sync failed: {str(e)}")
        if db:
            try:
                await _update_job_status(
                    db,
                    job_id,
                    'failed',
                    {
                        'error': str(e),
                        'error_type': type(e).__name__,
                    }
                )
            except:
                pass
        
        return {
            'success': False,
            'error': str(e),
            'job_id': job_id,
        }
    
    finally:
        if db:
            try:
                db.close()
            except Exception:
                pass
    
    return {'success': False, 'error': 'Unknown error occurred'}


async def _load_connector(db, org_id: str, connector_id: str) -> Optional[Dict]:
    """Load connector from database."""
    try:
        cursor = db.cursor()
        query = """
            SELECT id, type, org_id, encrypted_config, config_json, status,
                   last_synced_at, created_at
            FROM connectors
            WHERE id = %s AND org_id = %s
        """
        cursor.execute(query, (connector_id, org_id))
        row = cursor.fetchone()
        
        if not row:
            return None
        
        return {
            'id': row[0],
            'type': row[1],
            'org_id': row[2],
            'encrypted_config': row[3],
            'config_json': row[4],
            'status': row[5],
            'last_synced_at': row[6],
            'created_at': row[7],
        }
    except Exception as e:
        logger.error(f"Failed to load connector: {e}")
        return None


async def _decrypt_config(encrypted_config: Any, config_json: Dict) -> Dict:
    """
    Decrypt connector configuration.
    
    Returns merged config with encrypted tokens decrypted.
    """
    try:
        if encrypted_config:
            from utils.crypto import decrypt
            # Decrypt returns plaintext string
            decrypted_json = decrypt(encrypted_config)
            decrypted_data = json.loads(decrypted_json)
            
            # Merge with non-encrypted config_json if exists
            full_config = (config_json or {}).copy()
            full_config.update(decrypted_data)
            return full_config
            
        return config_json or {}
    except Exception as e:
        logger.error(f"Failed to decrypt config: {e}")
        return config_json or {}


async def _store_sync_results(
    db,
    org_id: str,
    connector_id: str,
    connector_type: str,
    sync_result,
) -> None:
    """Store sync results to database."""
    try:
        cursor = db.cursor()
        
        # Update connector last_synced_at
        query = """
            UPDATE connectors
            SET last_synced_at = %s,
                last_sync_status = %s,
                last_sync_error = %s,
                config_json = config_json || %s,
                updated_at = %s
            WHERE id = %s
        """
        
        error_message = None
        if sync_result.errors:
            error_message = json.dumps(sync_result.errors[:1])  # First error
        
        cursor.execute(query, (
            datetime.utcnow(),
            sync_result.status,
            error_message,
            json.dumps({
                'last_sync_summary': {
                    'records_fetched': sync_result.total_records_fetched,
                    'records_processed': sync_result.total_records_processed,
                    'records_inserted': sync_result.total_records_inserted,
                    'records_updated': sync_result.total_records_updated,
                    'records_skipped': sync_result.total_records_skipped,
                    'duplicates_detected': sync_result.total_duplicates_detected,
                }
            }),
            datetime.utcnow(),
            connector_id,
        ))
        
        db.commit()
        
        logger.info(f"Stored sync results for connector {connector_id}")
        
    except Exception as e:
        logger.error(f"Failed to store sync results: {e}")
        if db:
            db.rollback()


async def _update_job_status(
    db,
    job_id: str,
    status: str,
    result: Optional[Dict] = None,
) -> None:
    """Update job status in database."""
    try:
        cursor = db.cursor()
        query = """
            UPDATE jobs
            SET status = %s,
                logs = CASE 
                    WHEN logs IS NULL THEN %s::jsonb
                    ELSE logs || %s::jsonb
                END,
                finished_at = %s,
                updated_at = %s
            WHERE id = %s
        """
        
        log_entry = {
            'ts': datetime.utcnow().isoformat(),
            'level': 'info',
            'msg': f'Job {status}',
            'meta': {'result': result}
        }
        log_json = json.dumps([log_entry])
        
        cursor.execute(query, (
            status,
            log_json,
            log_json,
            datetime.utcnow() if status == 'completed' else None,
            datetime.utcnow(),
            job_id,
        ))
        
        db.commit()
    except Exception as e:
        logger.error(f"Failed to update job status: {e}")
        if db:
            db.rollback()


# Job handler registration
# This is called by python-worker/worker.py to register this handler
def register_handler():
    """Register this handler with the job system."""
    return {
        'connector_sync': handle_connector_sync,
        'connector_initial_sync': handle_connector_sync,  # Same handler for initial sync
    }
