"""
Connector Sync Job Handler

Industrial baseline behavior:
- Updates connector sync metadata (last_synced_at, last_sync_status, last_sync_error)
- Emits job logs with newTransactionsPulled for health endpoints

NOTE: This repo currently uses mock OAuth adapters (no real ERP/CRM APIs wired here).
So this job intentionally does NOT fetch external data unless you implement provider clients.
"""

import json
import os
import time
from datetime import datetime, timezone, timedelta
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
            SELECT id, "orgId", type, status, encrypted_config, last_synced_at, config_json
            FROM connectors
            WHERE id = %s
            """,
            (connector_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Connector not found: {connector_id}")

        _, connector_org_id, connector_type, connector_status, encrypted_config, last_synced_at, connector_config_json = row

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
        elif connector_type == 'quickbooks':
            # QuickBooks Online API sync
            if not encrypted_config:
                raise ValueError("QuickBooks connector has no encrypted_config set")

            decrypted = decrypt_bytes(encrypted_config)
            cfg = json.loads(decrypted)
            access_token = cfg.get('accessToken', '').strip()
            # Get realm_id from config_json (stored during OAuth callback)
            realm_id = None
            if connector_config_json:
                realm_id = connector_config_json.get('realmId')
            
            if not access_token:
                raise ValueError("QuickBooks connector has no access token")
            if not realm_id:
                raise ValueError("QuickBooks connector has no realm ID. Please reconnect.")

            # Determine API base URL (sandbox vs production)
            api_base = "https://sandbox-quickbooks.api.intuit.com" if os.getenv('QUICKBOOKS_ENVIRONMENT') != 'production' else "https://quickbooks.api.intuit.com"
            
            # Incremental sync: use last_synced_at if present, else 180 days back
            if last_synced_at:
                start_date = (last_synced_at.replace(tzinfo=timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%d')
            else:
                start_date = (datetime.now(timezone.utc) - timedelta(days=180)).strftime('%Y-%m-%d')
            
            end_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            }

            # Fetch transactions (Payments, Bills, Journal Entries)
            fetched = 0
            for entity_type in ['Payment', 'Bill', 'JournalEntry']:
                if check_cancel_requested(job_id):
                    mark_cancelled(job_id)
                    return

                url = f"{api_base}/v3/company/{realm_id}/query"
                query = f"SELECT * FROM {entity_type} WHERE TxnDate >= '{start_date}' AND TxnDate <= '{end_date}'"
                
                params = {"minorversion": "65", "query": query}
                
                try:
                    resp = requests.get(url, headers=headers, params=params, timeout=30)
                    if resp.status_code == 401:
                        # Token expired, mark connector as needing refresh
                        raise ValueError("QuickBooks access token expired. Please reconnect.")
                    if resp.status_code >= 400:
                        logger.warning(f"QuickBooks API error for {entity_type}: {resp.status_code}: {resp.text[:300]}")
                        continue

                    data = resp.json()
                    query_response = data.get('QueryResponse', {})
                    items = query_response.get(entity_type, [])
                    if not isinstance(items, list):
                        items = [items] if items else []

                    for item in items:
                        fetched += 1
                        txn_id = item.get('Id')
                        if not txn_id:
                            continue

                        txn_date_str = item.get('TxnDate', end_date)
                        try:
                            dt = datetime.strptime(txn_date_str, '%Y-%m-%d').date()
                        except:
                            dt = datetime.now(timezone.utc).date()

                        # Extract amount based on entity type
                        amount = 0.0
                        if entity_type == 'Payment':
                            amount = float(item.get('TotalAmt', 0) or 0)
                        elif entity_type == 'Bill':
                            amount = -float(item.get('TotalAmt', 0) or 0)  # Bills are expenses (negative)
                        elif entity_type == 'JournalEntry':
                            # Journal entries have line items
                            line_items = item.get('Line', [])
                            for line in line_items:
                                if line.get('DetailType') == 'JournalEntryLineDetail':
                                    detail = line.get('JournalEntryLineDetail', {})
                                    amount += float(detail.get('PostingType') == 'Debit' and detail.get('Amount', 0) or -detail.get('Amount', 0))

                        currency = (item.get('CurrencyRef', {}).get('value') or 'USD').upper()
                        description = item.get('DocNumber') or item.get('PrivateNote') or f"{entity_type} {txn_id}"
                        category = entity_type.lower()

                        source_id = f"quickbooks:{entity_type.lower()}:{txn_id}"

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
                                json.dumps(item),
                            ),
                        )
                        if cursor.rowcount > 0:
                            new_txn_count += 1

                except Exception as e:
                    logger.error(f"Error fetching QuickBooks {entity_type}: {str(e)}")
                    continue

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
                    json.dumps({
                        "provider": "quickbooks",
                        "fetched": fetched,
                        "inserted": new_txn_count,
                        "startDate": start_date,
                        "endDate": end_date,
                        "completedAt": datetime.now(timezone.utc).isoformat(),
                    }),
                    import_batch_id,
                ),
            )

        elif connector_type == 'xero':
            # Xero API sync
            if not encrypted_config:
                raise ValueError("Xero connector has no encrypted_config set")

            decrypted = decrypt_bytes(encrypted_config)
            cfg = json.loads(decrypted)
            access_token = cfg.get('accessToken', '').strip()
            
            if not access_token:
                raise ValueError("Xero connector has no access token")

            # Get tenant ID from config_json (stored during OAuth callback)
            tenant_id = None
            if connector_config_json:
                tenant_id = connector_config_json.get('tenantId')
            
            if not tenant_id:
                # Try to get from Xero connections API
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                }
                try:
                    resp = requests.get("https://api.xero.com/connections", headers=headers, timeout=30)
                    if resp.status_code == 200:
                        connections = resp.json()
                        if connections:
                            tenant_id = connections[0].get('tenantId')
                except:
                    pass
            
            if not tenant_id:
                raise ValueError("Xero connector has no tenant ID. Please reconnect.")

            # Incremental sync
            if last_synced_at:
                start_date = (last_synced_at.replace(tzinfo=timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%d')
            else:
                start_date = (datetime.now(timezone.utc) - timedelta(days=180)).strftime('%Y-%m-%d')

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Xero-tenant-id": tenant_id,
                "Accept": "application/json",
            }

            fetched = 0
            # Fetch payments and invoices
            for endpoint in ['payments', 'invoices']:
                if check_cancel_requested(job_id):
                    mark_cancelled(job_id)
                    return

                url = f"https://api.xero.com/api.xro/2.0/{endpoint}"
                params = {"where": f"Date >= DateTime({start_date})"}

                try:
                    resp = requests.get(url, headers=headers, params=params, timeout=30)
                    if resp.status_code == 401:
                        raise ValueError("Xero access token expired. Please reconnect.")
                    if resp.status_code >= 400:
                        logger.warning(f"Xero API error for {endpoint}: {resp.status_code}: {resp.text[:300]}")
                        continue

                    data = resp.json()
                    items = data.get(endpoint.capitalize(), [])
                    if not isinstance(items, list):
                        items = [items] if items else []

                    for item in items:
                        fetched += 1
                        txn_id = item.get('PaymentID') or item.get('InvoiceID')
                        if not txn_id:
                            continue

                        date_str = item.get('Date') or item.get('DateString', end_date)
                        try:
                            # Xero dates can be in various formats
                            if 'T' in date_str:
                                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
                            else:
                                dt = datetime.strptime(date_str.split('T')[0], '%Y-%m-%d').date()
                        except:
                            dt = datetime.now(timezone.utc).date()

                        amount = float(item.get('Amount', 0) or 0)
                        if endpoint == 'invoices':
                            # Invoices can be negative if they're credit notes
                            if item.get('Type') == 'ACCRECCREDIT' or item.get('Type') == 'ACCPAYCREDIT':
                                amount = -abs(amount)
                        
                        currency = (item.get('CurrencyCode') or 'USD').upper()
                        description = item.get('Reference') or item.get('InvoiceNumber') or f"{endpoint} {txn_id}"
                        category = endpoint

                        source_id = f"xero:{endpoint}:{txn_id}"

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
                                json.dumps(item),
                            ),
                        )
                        if cursor.rowcount > 0:
                            new_txn_count += 1

                except Exception as e:
                    logger.error(f"Error fetching Xero {endpoint}: {str(e)}")
                    continue

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
                    json.dumps({
                        "provider": "xero",
                        "fetched": fetched,
                        "inserted": new_txn_count,
                        "startDate": start_date,
                        "completedAt": datetime.now(timezone.utc).isoformat(),
                    }),
                    import_batch_id,
                ),
            )

        elif connector_type == 'zoho':
            # Zoho Books API sync
            if not encrypted_config:
                raise ValueError("Zoho connector has no encrypted_config set")

            decrypted = decrypt_bytes(encrypted_config)
            cfg = json.loads(decrypted)
            access_token = cfg.get('accessToken', '').strip()
            
            if not access_token:
                raise ValueError("Zoho connector has no access token")

            # Get organization ID from config_json
            org_id_zoho = None
            if connector_config_json:
                org_id_zoho = connector_config_json.get('organizationId')
            
            if not org_id_zoho:
                # Try to get from Zoho organizations API
                headers = {
                    "Authorization": f"Zoho-oauthtoken {access_token}",
                    "Accept": "application/json",
                }
                try:
                    resp = requests.get("https://books.zoho.com/api/v3/organizations", headers=headers, timeout=30)
                    if resp.status_code == 200:
                        data = resp.json()
                        orgs = data.get('organizations', [])
                        if orgs:
                            org_id_zoho = orgs[0].get('organization_id')
                except:
                    pass
            
            if not org_id_zoho:
                raise ValueError("Zoho connector has no organization ID. Please reconnect.")

            # Incremental sync
            if last_synced_at:
                start_date = (last_synced_at.replace(tzinfo=timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%d')
            else:
                start_date = (datetime.now(timezone.utc) - timedelta(days=180)).strftime('%Y-%m-%d')

            headers = {
                "Authorization": f"Zoho-oauthtoken {access_token}",
                "Accept": "application/json",
            }

            fetched = 0
            # Fetch payments and invoices
            for endpoint in ['payments', 'invoices']:
                if check_cancel_requested(job_id):
                    mark_cancelled(job_id)
                    return

                url = f"https://books.zoho.com/api/v3/{endpoint}"
                params = {
                    "organization_id": org_id_zoho,
                    "date_start": start_date,
                    "date_end": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                }

                try:
                    resp = requests.get(url, headers=headers, params=params, timeout=30)
                    if resp.status_code == 401:
                        raise ValueError("Zoho access token expired. Please reconnect.")
                    if resp.status_code >= 400:
                        logger.warning(f"Zoho API error for {endpoint}: {resp.status_code}: {resp.text[:300]}")
                        continue

                    data = resp.json()
                    items = data.get(endpoint, [])
                    if not isinstance(items, list):
                        items = [items] if items else []

                    for item in items:
                        fetched += 1
                        txn_id = item.get('payment_id') or item.get('invoice_id')
                        if not txn_id:
                            continue

                        date_str = item.get('date') or item.get('invoice_date', datetime.now(timezone.utc).strftime('%Y-%m-%d'))
                        try:
                            dt = datetime.strptime(date_str, '%Y-%m-%d').date()
                        except:
                            dt = datetime.now(timezone.utc).date()

                        amount = float(item.get('amount', 0) or 0)
                        currency = (item.get('currency_code') or item.get('currency_symbol', 'USD')).upper()
                        description = item.get('reference_number') or item.get('invoice_number') or f"{endpoint} {txn_id}"
                        category = endpoint

                        source_id = f"zoho:{endpoint}:{txn_id}"

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
                                json.dumps(item),
                            ),
                        )
                        if cursor.rowcount > 0:
                            new_txn_count += 1

                except Exception as e:
                    logger.error(f"Error fetching Zoho {endpoint}: {str(e)}")
                    continue

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
                    json.dumps({
                        "provider": "zoho",
                        "fetched": fetched,
                        "inserted": new_txn_count,
                        "startDate": start_date,
                        "completedAt": datetime.now(timezone.utc).isoformat(),
                    }),
                    import_batch_id,
                ),
            )

        elif connector_type == 'tally':
            # Tally doesn't support API sync - users must export and upload CSV
            cursor.execute(
                """
                UPDATE data_import_batches
                SET status = %s,
                    stats_json = %s::jsonb
                WHERE id = %s
                """,
                (
                    'completed',
                    json.dumps({
                        "provider": "tally",
                        "message": "Tally requires manual CSV export. Please use the CSV import feature.",
                        "inserted": 0,
                    }),
                    import_batch_id,
                ),
            )

        else:
            # Other connectors (plaid, razorpay, etc.) - stub for now
            cursor.execute(
                """
                UPDATE data_import_batches
                SET status = %s,
                    stats_json = %s::jsonb
                WHERE id = %s
                """,
                ('completed', json.dumps({"provider": connector_type, "inserted": 0, "message": "Not yet implemented"}), import_batch_id),
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

        # Trigger auto-model after connector sync if new transactions were pulled
        if new_txn_count > 0:
            try:
                logger.info(f"Auto-model: Triggering auto-model after connector sync ({new_txn_count} new transactions)")
                
                # Check for user-provided initial values from previous import batches (most reliable fallback)
                initial_cash = 0
                initial_customers = 0
                
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT mapping_json FROM data_import_batches 
                    WHERE "org_id" = %s AND source_type = 'csv' 
                    ORDER BY created_at DESC LIMIT 1
                """, (connector_org_id,))
                batch_row = cursor.fetchone()
                if batch_row and batch_row[0]:
                    mapping = batch_row[0] if isinstance(batch_row[0], dict) else json.loads(batch_row[0])
                    initial_cash = mapping.get('initialCash') or mapping.get('startingCash') or 0
                    initial_customers = mapping.get('initialCustomers') or mapping.get('startingCustomers') or 0
                
                # Create auto-model trigger job
                trigger_params = {
                    'triggerType': 'connector_sync',
                    'triggerSource': job_id,
                    'newTransactionsPulled': new_txn_count,
                    'cashOnHand': float(initial_cash or 0),
                    'startingCustomers': int(initial_customers or 0)
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
                    connector_org_id,
                    job_id,
                    json.dumps(trigger_logs),
                ))
                conn.commit()
                logger.info(f"Auto-model trigger job created after connector sync")
            except Exception as e:
                logger.warning(f"Failed to create auto-model trigger after connector sync: {str(e)}")
                # Don't fail the sync if auto-model trigger fails
        
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


