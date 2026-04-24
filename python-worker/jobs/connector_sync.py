"""
Connector Sync Job Handler (Production-Ready)

Executes full connector syncs with:
- Unified schema normalization across all 11 platforms
- Deduplication with hash-based anti-duplication layer
- Atomic all-or-nothing upsert operations
- Comprehensive audit logging with trace IDs
- Platform-specific trap handling (OAuth refresh, token mgmt, fee reconciliation)
- Error handling and automatic retries

This handler bridges the job queue with the production connector framework.
Each connector is instantiated and executed asynchronously for optimal performance.
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from utils.db import get_db_connection
from utils.logger import setup_logger
from utils.crypto import decrypt
from jobs.runner import update_progress, check_cancel_requested, mark_cancelled
from connectors import get_connector_class

logger = setup_logger()


def handle_connector_sync(job_id: str, org_id: str, object_id: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Handle connector sync job.
    
    This is the main entry point called by the job queue. It:
    1. Loads connector from database
    2. Decrypts OAuth tokens
    3. Instantiates appropriate connector class
    4. Executes async sync
    5. Returns results
    
    Args:
        job_id: Job ID for tracking
        org_id: Organization ID
        object_id: Connector ID database record
        params: Job parameters (contains connector_type, etc.)
    
    Returns:
        Dictionary with sync results
    """
    
    db = None
    try:
        # Handle both old and new parameter styles
        if isinstance(params, dict) and 'params' in params:
            params = params.get('params', {})
        params = params or {}
        
        connector_id = params.get('connectorId') or object_id
        connector_type = params.get('type', '').lower()
        
        logger.info(
            f"🔄 Starting connector sync. Job: {job_id}, Org: {org_id}, "
            f"Connector: {connector_id}, Type: {connector_type}"
        )
        
        # Check for cancellation
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return {'success': False, 'cancelled': True, 'job_id': job_id}
        
        # Connect to database
        db = get_db_connection()
        update_progress(job_id, 10, {'status': 'loading_connector'})
        
        # Load connector from database
        connector_record = _load_connector(db, org_id, connector_id)
        if not connector_record:
            error = f"Connector {connector_id} not found for org {org_id}"
            logger.error(f"❌ {error}")
            update_progress(job_id, 100, {'status': 'failed', 'error': error})
            return {'success': False, 'error': error, 'job_id': job_id}
        
        connector_type = connector_record['type'].lower()
        
        # Check connector status
        if connector_record['status'] != 'connected':
            error = f"Connector {connector_id} is not connected (status: {connector_record['status']})"
            logger.warning(f"⚠️  {error}")
            _update_connector_status(db, connector_id, 'failed', error)
            update_progress(job_id, 100, {'status': 'failed', 'error': error})
            return {'success': False, 'error': error, 'job_id': job_id}
        
        # Check cancellation again before heavy work
        update_progress(job_id, 20, {'status': 'decrypting_config'})
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return {'success': False, 'cancelled': True, 'job_id': job_id}
        
        # Decrypt config
        decrypted_config = _decrypt_config(
            connector_record.get('encrypted_config'),
            connector_record.get('config_json') or {}
        )
        
        # Get connector class
        try:
            ConnectorClass = get_connector_class(connector_type)
        except ValueError as e:
            error = str(e)
            logger.error(f"❌ {error}")
            update_progress(job_id, 100, {'status': 'failed', 'error': error})
            return {'success': False, 'error': error, 'job_id': job_id}
        
        # Instantiate connector
        connector = ConnectorClass(
            org_id=org_id,
            connector_id=connector_id,
            encrypted_config=decrypted_config,
        )
        
        logger.info(
            f"⚙️  Executing {connector_type} sync for org {org_id}. "
            f"Trace: {connector.trace_id}"
        )
        
        update_progress(job_id, 40, {
            'status': 'syncing',
            'connector_type': connector_type,
            'trace_id': connector.trace_id,
        })
        
        # Execute async sync
        sync_result = asyncio.run(connector.sync())
        
        # Check cancellation after sync
        if check_cancel_requested(job_id):
            logger.warning(f"Sync cancelled for {connector_id}")
            mark_cancelled(job_id)
            return {'success': False, 'cancelled': True, 'job_id': job_id}
        
        # Update progress
        update_progress(job_id, 80, {
            'status': 'storing_results',
            'records': {
                'fetched': sync_result.total_records_fetched,
                'processed': sync_result.total_records_processed,
                'inserted': sync_result.total_records_inserted,
                'updated': sync_result.total_records_updated,
                'skipped': sync_result.total_records_skipped,
                'duplicates': sync_result.total_duplicates_detected,
            }
        })
        
        # Store results to database
        _store_sync_results(db, connector_id, sync_result)
        
        _update_connector_status(
            db,
            connector_id,
            sync_result.status,
            sync_result.errors[0]['message'] if sync_result.errors else None,
            sync_result.trace_id,
            stats={
                'records_fetched': sync_result.total_records_fetched,
                'records_processed': sync_result.total_records_processed,
                'records_inserted': sync_result.total_records_inserted,
                'records_updated': sync_result.total_records_updated,
                'last_sync_timestamp': datetime.now(timezone.utc).isoformat()
            }
        )

        # Trigger model run to update dashboards and insights automatically
        if sync_result.status == 'completed':
            try:
                synced_by = params.get('syncedBy') if params else None
                _trigger_model_run(db, org_id, synced_by)
                logger.info(f"Queued model run for org {org_id} after sync")
            except Exception as trigger_err:
                logger.error(f"Failed to trigger model run after sync: {trigger_err}")
        
        # Log completion
        logger.info(
            f"✅ Connector sync completed for {connector_type}. "
            f"Inserted: {sync_result.total_records_inserted}, "
            f"Updated: {sync_result.total_records_updated}, "
            f"Skipped: {sync_result.total_records_skipped}, "
            f"Duplicates: {sync_result.total_duplicates_detected}. "
            f"Trace: {connector.trace_id}"
        )
        
        result = sync_result.to_dict()
        
        update_progress(job_id, 100, {
            'status': 'completed',
            'result': result,
        })
        
        return {
            'success': True,
            'job_id': job_id,
            'result': result,
            'trace_id': connector.trace_id,
        }
        
    except Exception as e:
        logger.error(f"❌ Connector sync failed: {str(e)}", exc_info=True)
        update_progress(job_id, 100, {
            'status': 'failed',
            'error': str(e),
            'error_type': type(e).__name__,
        })
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


def _load_connector(db, org_id: str, connector_id: str) -> Optional[Dict]:
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


def _decrypt_config(encrypted_config: Optional[bytes], config_json: Dict) -> Dict:
    """Decrypt connector configuration."""
    try:
        if encrypted_config:
            # Handle both bytes and string
            if isinstance(encrypted_config, str):
                encrypted_config = encrypted_config.encode()
            
            decrypted_json = decrypt(encrypted_config)
            return json.loads(decrypted_json)
        return config_json or {}
    except Exception as e:
        logger.error(f"Failed to decrypt config: {e}")
        return config_json or {}


def _store_sync_results(db, connector_id: str, sync_result) -> None:
    """Store sync results to database."""
    try:
        cursor = db.cursor()
        
        # Insert to data_import_batches for provenance tracking
        query = """
            INSERT INTO data_import_batches (
                org_id, source_type, source_ref, stats_json, status
            )
            VALUES (%s, %s, %s, %s::jsonb, %s)
            RETURNING id
        """
        
        stats = {
            'records_fetched': sync_result.total_records_fetched,
            'records_processed': sync_result.total_records_processed,
            'records_inserted': sync_result.total_records_inserted,
            'records_updated': sync_result.total_records_updated,
            'records_skipped': sync_result.total_records_skipped,
            'duplicates_detected': sync_result.total_duplicates_detected,
            'trace_id': sync_result.trace_id,
            'started_at': sync_result.started_at.isoformat() if sync_result.started_at else None,
            'completed_at': sync_result.completed_at.isoformat() if sync_result.completed_at else None,
        }
        
        cursor.execute(query, (
            sync_result.org_id,
            'connector',
            connector_id,
            json.dumps(stats),
            'completed' if sync_result.status == 'completed' else 'failed',
        ))
        
        db.commit()
        logger.info(f"Stored sync results for connector {connector_id}")
        
    except Exception as e:
        logger.error(f"Failed to store sync results: {e}")
        try:
            db.rollback()
        except:
            pass


def _update_connector_status(
    db,
    connector_id: str,
    status: str,
    error: Optional[str] = None,
    trace_id: Optional[str] = None,
    stats: Optional[dict] = None,
) -> None:
    """Update connector status in database and optionally store stats in config_json."""
    try:
        cursor = db.cursor()
        # If sync status is 'completed' or 'done', we should mark the main connector status as 'connected'
        main_status_update = ""
        if status in ['completed', 'done']:
            main_status_update = "status = 'connected',"

        query = f"""
            UPDATE connectors
            SET {main_status_update}
                last_synced_at = %s,
                last_sync_status = %s,
                last_sync_error = %s,
                config_json = config_json || %s::jsonb,
                updated_at = %s
            WHERE id = %s
        """
        
        additional_config = {}
        if trace_id:
            additional_config['last_trace_id'] = trace_id
        if stats:
            additional_config['last_sync_stats'] = stats
        
        cursor.execute(query, (
            datetime.now(timezone.utc),
            status,
            error,
            json.dumps(additional_config),
            datetime.now(timezone.utc),
            connector_id,
        ))
        
        db.commit()
    except Exception as e:
        logger.error(f"Failed to update connector status: {e}")
        try:
            db.rollback()
        except:
            pass

def _trigger_model_run(db, org_id: str, user_id: Optional[str] = None) -> None:
    """Trigger a new model execution job for the organization."""
    import uuid
    try:
        cursor = db.cursor()
        params = {
            "triggerType": "post_sync",
            "orgId": org_id
        }
        if user_id:
            params["userId"] = user_id
            
        logs = [{
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": "info",
            "msg": "Job queued from connector sync",
            "meta": {"params": params}
        }]
            
        query = """
            INSERT INTO public.jobs (
                id, job_type, org_id, status, logs, queue,
                created_at, updated_at
            ) VALUES (
                gen_random_uuid(), 'auto_model_trigger', %s, 'queued', %s::jsonb, 'default',
                NOW(), NOW()
            )
        """
        cursor.execute(query, (org_id, json.dumps(logs)))
        db.commit()
    except Exception as e:
        logger.error(f"Failed to queue model run: {e}")
        try:
            db.rollback()
        except:
            pass
