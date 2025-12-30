"""
Connector Sync Job Handler

Industrial baseline behavior:
- Updates connector sync metadata (last_synced_at, last_sync_status, last_sync_error)
- Emits job logs with newTransactionsPulled for health endpoints

NOTE: This repo currently uses mock OAuth adapters (no real ERP/CRM APIs wired here).
So this job intentionally does NOT fetch external data unless you implement provider clients.
"""

import json
import time
from datetime import datetime, timezone
import requests
from utils.db import get_db_connection
from utils.logger import setup_logger
from jobs.runner import update_progress, check_cancel_requested, mark_cancelled
from utils.crypto import decrypt_bytes

logger = setup_logger()


def handle_connector_sync(job_id: str, org_id: str, object_id: str, logs: dict):
    conn = None
    cursor = None

    # Extract params from logs (runner normalizes to dict with 'params')
    params = {}
    if isinstance(logs, dict):
        params = logs.get('params', {}) or {}

    connector_id = params.get('connectorId') or object_id

    try:
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return

        conn = get_db_connection()
        cursor = conn.cursor()

        update_progress(job_id, 10, {'status': 'loading_connector', 'connectorId': connector_id})

        # Fetch connector (orgId is camelCase, other fields are snake_case)
        cursor.execute(
            """
            SELECT id, "orgId", type, status, encrypted_config, last_synced_at
            FROM connectors
            WHERE id = %s
            """,
            (connector_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Connector not found: {connector_id}")

        _, connector_org_id, connector_type, connector_status, encrypted_config, last_synced_at = row

        # Defensive org check
        if org_id and str(connector_org_id) != str(org_id):
            logger.warning(
                f"connector_sync org mismatch: job org={org_id} connector org={connector_org_id}"
            )

        if connector_status != 'connected':
            # Mark connector as failed (not connected)
            cursor.execute(
                """
                UPDATE connectors
                SET last_sync_status = %s,
                    last_sync_error = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                ('failed', 'Connector is not connected', connector_id),
            )
            conn.commit()
            raise ValueError("Connector is not connected")

        update_progress(job_id, 40, {'status': 'syncing', 'connectorType': connector_type})

        # Create an import batch for connector sync (lineage root)
        cursor.execute(
            """
            INSERT INTO data_import_batches ("org_id", "source_type", "source_ref", "status", "created_at")
            VALUES (%s, %s, %s, %s, NOW())
            RETURNING id
            """,
            (connector_org_id, 'connector', str(connector_id), 'running'),
        )
        import_batch_id = cursor.fetchone()[0]

        new_txn_count = 0

        # Real Stripe sync (first real connector): pull balance transactions
        if connector_type == 'stripe':
            if not encrypted_config:
                raise ValueError("Stripe connector has no encrypted_config set")

            decrypted = decrypt_bytes(encrypted_config)
            cfg = json.loads(decrypted)
            stripe_key = (cfg.get('stripeSecretKey') or '').strip()
            if not stripe_key.startswith('sk_'):
                raise ValueError("Invalid Stripe key in connector config")

            # Incremental sync: use last_synced_at if present, else 180 days back
            now_ts = int(time.time())
            if last_synced_at:
                # include small overlap to reduce missing edge cases
                start_ts = int(last_synced_at.replace(tzinfo=timezone.utc).timestamp()) - 300
            else:
                start_ts = now_ts - (180 * 24 * 3600)

            headers = {
                "Authorization": f"Bearer {stripe_key}",
            }
            params_qs = {
                "limit": 100,
                "created[gte]": start_ts,
            }

            starting_after = None
            fetched = 0

            while True:
                if check_cancel_requested(job_id):
                    mark_cancelled(job_id)
                    return

                if starting_after:
                    params_qs["starting_after"] = starting_after
                elif "starting_after" in params_qs:
                    params_qs.pop("starting_after", None)

                resp = requests.get("https://api.stripe.com/v1/balance_transactions", headers=headers, params=params_qs, timeout=30)
                if resp.status_code >= 400:
                    raise ValueError(f"Stripe API error {resp.status_code}: {resp.text[:300]}")

                data = resp.json()
                items = data.get("data", []) or []
                has_more = bool(data.get("has_more"))

                for bt in items:
                    fetched += 1
                    bt_id = bt.get("id")
                    if not bt_id:
                        continue

                    created = int(bt.get("created") or now_ts)
                    dt = datetime.fromtimestamp(created, tz=timezone.utc).date()

                    currency = (bt.get("currency") or "usd").upper()
                    net_cents = int(bt.get("net") or 0)
                    amount = net_cents / 100.0

                    # Category: Stripe type / reporting_category
                    category = bt.get("reporting_category") or bt.get("type") or "stripe"
                    description = bt.get("description") or bt.get("type") or "Stripe"

                    source_id = f"stripe:bal_txn:{bt_id}"

                    cursor.execute(
                        """
                        INSERT INTO raw_transactions
                          ("orgId", "connectorId", import_batch_id, source_id, date, amount, currency, category, description, raw_payload, is_duplicate)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, false)
                        ON CONFLICT ("orgId", source_id) DO NOTHING
                        """,
                        (
                            connector_org_id,
                            connector_id,
                            import_batch_id,
                            source_id,
                            dt,
                            amount,
                            currency,
                            category,
                            description,
                            json.dumps(bt),
                        ),
                    )
                    if cursor.rowcount > 0:
                        new_txn_count += 1

                if not items:
                    break

                starting_after = items[-1].get("id")
                if not has_more:
                    break

            # Update batch stats
            cursor.execute(
                """
                UPDATE data_import_batches
                SET status = %s,
                    stats_json = %s::jsonb
                WHERE id = %s
                """,
                (
                    'completed',
                    json.dumps(
                        {
                            "provider": "stripe",
                            "fetched": fetched,
                            "inserted": new_txn_count,
                            "startedAt": datetime.fromtimestamp(start_ts, tz=timezone.utc).isoformat(),
                            "completedAt": datetime.now(timezone.utc).isoformat(),
                        }
                    ),
                    import_batch_id,
                ),
            )
        else:
            # Non-stripe connectors remain a stub until real adapters are implemented.
            cursor.execute(
                """
                UPDATE data_import_batches
                SET status = %s,
                    stats_json = %s::jsonb
                WHERE id = %s
                """,
                ('completed', json.dumps({"provider": connector_type, "inserted": 0}), import_batch_id),
            )

        cursor.execute(
            """
            UPDATE connectors
            SET last_synced_at = NOW(),
                last_sync_status = %s,
                last_sync_error = NULL,
                updated_at = NOW()
            WHERE id = %s
            """,
            ('success', connector_id),
        )

        # Store sync stats in the job logs JSONB (append entry)
        cursor.execute(
            """
            SELECT logs FROM jobs WHERE id = %s
            """,
            (job_id,),
        )
        logs_raw = cursor.fetchone()[0]
        logs_list = logs_raw if isinstance(logs_raw, list) else []
        logs_list.append(
            {
                'ts': datetime.now(timezone.utc).isoformat(),
                'level': 'info',
                'msg': 'Connector sync completed',
                'meta': {
                    'newTransactionsPulled': new_txn_count,
                    'connectorId': connector_id,
                    'connectorType': connector_type,
                    'importBatchId': str(import_batch_id) if import_batch_id else None,
                },
            }
        )

        cursor.execute(
            """
            UPDATE jobs
            SET progress = 100,
                status = 'done',
                logs = %s::jsonb,
                updated_at = NOW(),
                finished_at = NOW()
            WHERE id = %s
            """,
            (json.dumps(logs_list), job_id),
        )

        conn.commit()
        logger.info(f"✅ connector_sync completed for {connector_id} ({connector_type}), newTxns={new_txn_count}")

    except Exception as e:
        # Best-effort: update connector error fields
        try:
            if cursor and connector_id:
                cursor.execute(
                    """
                    UPDATE connectors
                    SET last_sync_status = %s,
                        last_sync_error = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    ('failed', str(e)[:500], connector_id),
                )
                conn.commit()
        except Exception:
            pass
        logger.error(f"❌ connector_sync failed: {str(e)}", exc_info=True)
        raise
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn:
            try:
                conn.close()
            except Exception:
                pass


