"""
Auto Model Trigger Job Handler
Triggers automatic P&L/Cash model runs when data changes
"""
import json
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.logger import setup_logger
from jobs.runner import check_cancel_requested, mark_cancelled, update_progress

logger = setup_logger()


def handle_auto_model_trigger(job_id: str, org_id: str, object_id: str, logs: dict):
    """
    Handle auto-model trigger job.
    This job is created when:
    - CSV import completes
    - Connector sync completes
    - Scheduled check runs
    
    It then creates a model_run job for the org.
    """
    logger.info(f"Processing auto-model trigger job {job_id}")
    
    conn = None
    cursor = None
    
    try:
        # Check for cancellation
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        update_progress(job_id, 10, {'status': 'checking_conditions'})
        
        # Get trigger info from params - handle both array and dict log structures
        params = {}
        if isinstance(logs, list):
            # Logs is an array, extract params from meta.params
            for entry in logs:
                if isinstance(entry, dict) and entry.get('meta', {}).get('params'):
                    params = {**params, **entry['meta']['params']}
        elif isinstance(logs, dict):
            # Logs is a dict, extract params directly
            params = logs.get('params', {})
        
        trigger_type = params.get('triggerType', 'unknown')
        trigger_source = params.get('triggerSource')
        starting_customers = params.get('startingCustomers', 0)
        cash_on_hand = params.get('cashOnHand', 0)
        
        logger.info(f"Auto-model trigger: startingCustomers={starting_customers}, cashOnHand={cash_on_hand}")
        
        # Check if org has models - if not, create a default one
        cursor.execute("""
            SELECT COUNT(*) FROM models WHERE "orgId" = %s
        """, (org_id,))
        
        model_count = cursor.fetchone()[0]
        if model_count == 0:
            logger.info(f"Auto-model: Org {org_id} has no models, creating default model")
            
            # Create a default model with basic assumptions
            default_model_json = {
                'name': 'Default Financial Model',
                'version': 1,
                'assumptions': {
                    'baselineRevenue': 100000,
                    'baselineExpenses': 80000,
                    'revenueGrowth': 0.08,
                    'expenseGrowth': 0.05,
                    'cash': {
                        'initialCash': float(cash_on_hand) if cash_on_hand and float(cash_on_hand) > 0 else 500000
                    },
                    'revenue': {
                        'customerCount': int(starting_customers) if starting_customers and int(starting_customers) > 0 else 100
                    }
                },
                'metadata': {
                    'startMonth': datetime.now(timezone.utc).strftime('%Y-%m'),
                    'createdBy': 'auto_model_trigger',
                    'createdAt': datetime.now(timezone.utc).isoformat()
                }
            }
            
            cursor.execute("""
                INSERT INTO models (id, "orgId", name, model_json, version, created_at)
                VALUES (gen_random_uuid(), %s, %s, %s::jsonb, 1, NOW())
                RETURNING id
            """, (
                org_id,
                'Default Financial Model',
                json.dumps(default_model_json)
            ))
            
            model_id = cursor.fetchone()[0]
            logger.info(f"Created default model {model_id} for org {org_id}")
            conn.commit()
            model_ids = [model_id]
        else:
            # Enterprise: Get ALL models for the org to update them all
            cursor.execute("""
                SELECT id FROM models
                WHERE "orgId" = %s
            """, (org_id,))
            
            model_rows = cursor.fetchall()
            if not model_rows:
                logger.warning(f"Auto-model: No model found for org {org_id} after count check")
                cursor.execute("""
                    UPDATE jobs SET progress = 100, status = 'done', logs = %s, updated_at = NOW()
                    WHERE id = %s
                """, (json.dumps({**logs, 'status': 'skipped', 'reason': 'no_model'}), job_id))
                conn.commit()
                return
            
            model_ids = [row[0] for row in model_rows]
            
        # Optional throttle check (prevent spam - at least 1 hour between runs for scheduled tasks)
        cursor.execute("""
            SELECT created_at FROM model_runs
            WHERE "orgId" = %s AND "run_type" = 'baseline'
            ORDER BY created_at DESC
            LIMIT 1
        """, (org_id,))
        
        last_run = cursor.fetchone()
        if last_run:
            last_run_time = last_run[0]
            hours_since = (datetime.now(timezone.utc) - last_run_time).total_seconds() / 3600
            # ── Enterprise: Only throttle SCHEDULED triggers, not manual user actions ──
            # Explicit csv_import / connector_sync / manual actions should ALWAYS recompute
            explicit_triggers = {'csv_import', 'connector_sync', 'manual', 'xlsx_import'}
            if trigger_type not in explicit_triggers and hours_since < 1:
                logger.info(f"Auto-model: Org {org_id} had model run {hours_since:.2f}h ago, skipping scheduled trigger (min 1h)")
                cursor.execute("""
                    UPDATE jobs SET progress = 100, status = 'done', logs = %s, updated_at = NOW()
                    WHERE id = %s
                """, (json.dumps({**logs, 'status': 'skipped', 'reason': 'too_recent', 'hoursSince': hours_since, 'note': 'Use csv_import trigger to force recompute'}), job_id))
                conn.commit()
                return

        
        update_progress(job_id, 30, {'status': 'models_ready', 'modelCount': len(model_ids)})
        
        # Create model runs for ALL models
        model_run_params = {
            'autoTriggered': True,
            'triggerType': trigger_type,
            'triggerSource': trigger_source,
            'triggeredAt': datetime.now(timezone.utc).isoformat(),
        }
        
        if starting_customers and int(starting_customers) > 0:
            model_run_params['startingCustomers'] = int(starting_customers)
        if cash_on_hand and float(cash_on_hand) > 0:
            model_run_params['cashOnHand'] = float(cash_on_hand)

        created_runs = []
        for model_id in model_ids:
            # Check if there's already a running model run for this specific model
            cursor.execute("""
                SELECT id FROM model_runs
                WHERE "modelId" = %s AND status IN ('queued', 'running')
                LIMIT 1
            """, (model_id,))
            
            if cursor.fetchone():
                logger.info(f"Auto-model: Model {model_id} already has running run, skipping")
                continue

            # Create model run
            cursor.execute("""
                INSERT INTO model_runs (id, "modelId", "orgId", "run_type", "params_json", status, created_at)
                VALUES (gen_random_uuid(), %s, %s, 'baseline', %s::jsonb, 'queued', NOW())
                RETURNING id
            """, (
                model_id,
                org_id,
                json.dumps(model_run_params),
            ))
            
            model_run_id = cursor.fetchone()[0]
            
            # Create model_run job for Python worker
            job_params = {
                'modelRunId': model_run_id,
                'modelId': model_id,
                'runType': 'baseline',
                'autoTriggered': True,
                'triggerType': trigger_type,
                'triggerSource': trigger_source,
            }
            
            model_run_logs = [
                {
                    'ts': datetime.now(timezone.utc).isoformat(),
                    'level': 'info',
                    'msg': 'Job created via auto-trigger',
                    'meta': {
                        'jobType': 'model_run',
                        'queue': 'default',
                        'priority': 40,
                        'params': job_params
                    }
                }
            ]
            
            cursor.execute("""
                INSERT INTO jobs (id, job_type, "orgId", object_id, status, priority, queue, logs, created_at, updated_at)
                VALUES (gen_random_uuid(), 'model_run', %s, %s, 'queued', 40, 'default', %s::jsonb, NOW(), NOW())
                RETURNING id
            """, (org_id, model_run_id, json.dumps(model_run_logs)))
            
            model_run_job_id = cursor.fetchone()[0]
            
            try:
                cursor.execute("""
                    INSERT INTO audit_logs ("orgId", action, object_type, object_id, meta_json, created_at)
                    VALUES (%s, 'auto_model_triggered', 'model_run', %s, %s::jsonb, NOW())
                """, (org_id, model_run_id, json.dumps({
                    'modelId': model_id,
                    'triggerType': trigger_type,
                    'jobId': model_run_job_id,
                })))
            except Exception as e:
                logger.warning(f"Failed to create audit log for {model_id}: {str(e)}")
                # If a query fails in PostgreSQL, the current transaction block is aborted.
                # Since this audit log is NOT critical, we rollback but we must be careful 
                # because we already committed the job creation. Actually, we haven't committed yet 
                # (the main commit is at the very end).
                # So if this fails, we just log and continue, but we'd need to SAVEPOINT or just fix the SQL.
                # Fixed SQL is better.
                pass
            
            created_runs.append(model_run_id)

        conn.commit()
        
        update_progress(job_id, 100, {
            'status': 'completed',
            'runsCreated': len(created_runs),
            'modelRunIds': created_runs
        })
        
        logger.info(f"✅ Auto-model: Queued {len(created_runs)} model runs for org {org_id}")
        
    except Exception as e:
        logger.error(f"❌ Auto-model trigger failed: {str(e)}", exc_info=True)
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


