"""CSV Import Job Handler"""
import csv
import json
from io import StringIO
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.s3 import download_from_s3
from utils.logger import setup_logger

logger = setup_logger()

def handle_csv_import(job_id: str, org_id: str, object_id: str, logs: dict):
    """Handle CSV import job"""
    logger.info(f"Processing CSV import job {job_id}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Extract params from logs
    # Runner.py already normalizes logs to dict with 'params' key
    # But handle both cases for safety
    params = {}
    
    if isinstance(logs, dict):
        # Runner.py should have normalized this, but check both locations
        params = logs.get('params', {})
        if not isinstance(params, dict):
            params = {}
    elif isinstance(logs, list):
        # Fallback: extract from list format
        for entry in reversed(logs):
            if isinstance(entry, dict):
                if 'meta' in entry and isinstance(entry['meta'], dict):
                    if 'params' in entry['meta']:
                        params = entry['meta']['params']
                        break
                elif 'params' in entry:
                    params = entry['params']
                    break
    
    if not isinstance(params, dict):
        logger.warning(f"Params is not a dict, got {type(params)}, using empty dict")
        params = {}
    
    logger.info(f"Extracted params keys: {list(params.keys())}")
    logger.info(f"Params content: {json.dumps({k: str(v)[:50] if isinstance(v, str) and len(v) > 50 else v for k, v in params.items()}, indent=2)}")
    
    # Initialize logs_array - preserve existing logs structure
    if isinstance(logs, dict):
        logs_array = [logs] if logs else []
    elif isinstance(logs, list):
        logs_array = logs.copy() if logs else []
    else:
        logs_array = []
    
    try:
        # Update progress - preserve logs array structure
        logs_array.append({
            'ts': datetime.now(timezone.utc).isoformat(),
            'level': 'info',
            'msg': 'Starting CSV import',
            'meta': {'status': 'downloading', 'progress': 10}
        })
        
        cursor.execute("""
            UPDATE jobs SET progress = 10, logs = %s::jsonb, updated_at = NOW() WHERE id = %s
        """, (json.dumps(logs_array), job_id))
        conn.commit()
        
        upload_key = params.get('uploadKey')  # Get uploadKey from params
        s3_key = params.get('s3Key')  # S3 key if uploaded to S3 (may be None)
        file_data_base64 = params.get('fileData')  # Base64 file data if S3 not available
        
        logger.info(f"CSV import params: uploadKey={upload_key}, s3Key={s3_key}, fileData present={bool(file_data_base64)}, fileData length={len(file_data_base64) if file_data_base64 else 0}, params keys={list(params.keys())}")
        
        # Check if S3 is actually configured
        import os
        s3_bucket = os.getenv('S3_BUCKET_NAME')
        
        csv_text = None
        
        # Try S3 download only if S3 is configured AND s3_key is provided
        if s3_bucket and s3_key:
            try:
                csv_data = download_from_s3(s3_key)
                csv_text = csv_data.decode('utf-8')
                logger.info(f"CSV downloaded from S3: {s3_key}")
            except Exception as e:
                logger.warning(f"S3 download failed: {str(e)}, trying fileData fallback")
                s3_key = None  # Reset to try fileData
        
        # Use file data from job params if S3 not available or S3 download failed
        if not csv_text and file_data_base64:
            # Use file data from job params (base64 encoded)
            import base64
            csv_data = base64.b64decode(file_data_base64)
            csv_text = csv_data.decode('utf-8')
            logger.info("CSV loaded from job params (base64)")
        
        if not csv_text:
            raise ValueError(f"Neither S3 key nor fileData found in job logs. uploadKey: {upload_key}, s3Key: {s3_key}, fileData present: {bool(file_data_base64)}, params keys: {list(params.keys())}")
        
        # Update progress - append to existing logs_array
        logs_array.append({
            'ts': datetime.now(timezone.utc).isoformat(),
            'level': 'info',
            'msg': 'CSV downloaded, starting parse',
            'meta': {'status': 'parsing', 'progress': 30}
        })
        
        cursor.execute("""
            UPDATE jobs SET progress = 30, logs = %s::jsonb, updated_at = NOW() WHERE id = %s
        """, (json.dumps(logs_array), job_id))
        conn.commit()
        
        # Parse CSV
        logger.info(f"Parsing CSV text (length: {len(csv_text)} chars)")
        logger.info(f"First 500 chars of CSV: {csv_text[:500]}")
        
        # Handle different line endings and encoding
        csv_text_clean = csv_text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Strip BOM if present (UTF-8 BOM: \ufeff)
        if csv_text_clean.startswith('\ufeff'):
            csv_text_clean = csv_text_clean[1:]
            logger.info("Stripped UTF-8 BOM from CSV")
        
        reader = csv.DictReader(StringIO(csv_text_clean))
        rows = list(reader)
        
        logger.info(f"CSV parsed: {len(rows)} rows found")
        if rows:
            headers = list(rows[0].keys())
            logger.info(f"CSV headers: {headers}")
            logger.info(f"First row sample: {dict(list(rows[0].items())[:5])}")
            
            # Check for empty rows (CSV might have trailing newlines)
            rows = [row for row in rows if any(str(v).strip() for v in row.values() if v)]
            logger.info(f"After filtering empty rows: {len(rows)} rows")
        
        logs_array.append({
            'ts': datetime.now(timezone.utc).isoformat(),
            'level': 'info',
            'msg': f'CSV parsed, {len(rows)} rows found',
            'meta': {'status': 'importing', 'progress': 50, 'rows_found': len(rows)}
        })
        
        cursor.execute("""
            UPDATE jobs SET progress = 50, logs = %s::jsonb, updated_at = NOW() WHERE id = %s
        """, (json.dumps(logs_array), job_id))
        conn.commit()
        
        # Get mappings and other params
        mappings = params.get('mappings', {})
        currency_default = params.get('currency', 'USD')
        default_category = params.get('defaultCategory', 'Uncategorized')
        
        logger.info(f"Mappings received: {mappings}")
        logger.info(f"Currency: {currency_default}, Default category: {default_category}")
        
        # Insert transactions
        inserted = 0
        skipped = 0
        errors = []
        BATCH_SIZE = 50  # Commit every 50 rows to avoid losing all data on error
        total_rows = len(rows)  # Store total rows for progress calculation
        
        logger.info(f"Processing {total_rows} rows with mappings: {mappings}")
        if rows:
            logger.info(f"CSV headers: {list(rows[0].keys())}")
            logger.info(f"First row data: {dict(list(rows[0].items())[:5])}")
        
        # Log mapping details
        logger.info(f"Mapping details:")
        logger.info(f"  date -> '{mappings.get('date')}'")
        logger.info(f"  amount -> '{mappings.get('amount')}'")
        logger.info(f"  description -> '{mappings.get('description')}'")
        logger.info(f"  category -> '{mappings.get('category')}'")
        
        for idx, row in enumerate(rows):
            try:
                # Map CSV columns to transaction fields using mappings
                # mappings format: {'date': 'Date', 'amount': 'Amount', ...}
                # row format: {'Date': '2024-01-15', 'Amount': '100.50', ...}
                
                date_column = mappings.get('date')
                amount_column = mappings.get('amount')
                description_column = mappings.get('description')
                category_column = mappings.get('category')
                
                if not date_column or not amount_column:
                    logger.error(f"Row {idx+1}: Missing required mappings (date={date_column}, amount={amount_column}, mappings={mappings})")
                    skipped += 1
                    continue
                
                # Get values from CSV row - try exact match first, then case-insensitive
                date_str = None
                amount_str = None
                description = None
                category = None
                
                # Debug: Log row keys
                row_keys = list(row.keys())
                logger.debug(f"Row {idx+1} keys: {row_keys}")
                
                # Try exact match first (case-sensitive)
                if date_column in row:
                    date_str = str(row[date_column]).strip() if row[date_column] is not None else None
                    logger.debug(f"Row {idx+1}: Found date via exact match: '{date_str}'")
                if amount_column in row:
                    amount_str = str(row[amount_column]).strip() if row[amount_column] is not None else None
                    logger.debug(f"Row {idx+1}: Found amount via exact match: '{amount_str}'")
                if description_column and description_column in row:
                    description = str(row[description_column]).strip() if row[description_column] is not None else None
                if category_column and category_column in row:
                    category = str(row[category_column]).strip() if row[category_column] is not None else None
                
                # If exact match didn't work, try case-insensitive match
                if not date_str:
                    for key, value in row.items():
                        if key and key.strip().lower() == date_column.strip().lower():
                            date_str = str(value).strip() if value is not None else None
                            logger.debug(f"Row {idx+1}: Found date via case-insensitive match: '{date_str}' (key: '{key}')")
                            break
                
                if not amount_str:
                    for key, value in row.items():
                        if key and key.strip().lower() == amount_column.strip().lower():
                            amount_str = str(value).strip() if value is not None else None
                            logger.debug(f"Row {idx+1}: Found amount via case-insensitive match: '{amount_str}' (key: '{key}')")
                            break
                
                if not description and description_column:
                    for key, value in row.items():
                        if key and key.strip().lower() == description_column.strip().lower():
                            description = str(value).strip() if value is not None else None
                            break
                
                if not category and category_column:
                    for key, value in row.items():
                        if key and key.strip().lower() == category_column.strip().lower():
                            category = str(value).strip() if value is not None else None
                            break
                
                # Validate required fields
                if not date_str or not amount_str:
                    skipped += 1
                    logger.error(f"Row {idx+1}: Missing required fields (date={date_str}, amount={amount_str})")
                    logger.error(f"   Row keys: {row_keys}")
                    logger.error(f"   Looking for date in column: '{date_column}', amount in column: '{amount_column}'")
                    logger.error(f"   Row data: {dict(list(row.items())[:5])}")
                    continue
                
                logger.info(f"Row {idx+1}: Processing - date={date_str}, amount={amount_str}, description={description}, category={category}")
                
                # Parse date (handle multiple formats)
                # datetime is already imported at module level
                parsed_date = None
                date_formats = [
                    '%Y-%m-%d',      # 2024-01-15
                    '%Y/%m/%d',      # 2024/01/15
                    '%m/%d/%Y',      # 01/15/2024
                    '%d/%m/%Y',      # 15/01/2024
                    '%m-%d-%Y',      # 01-15-2024
                    '%d-%m-%Y',      # 15-01-2024
                    '%Y%m%d',        # 20240115
                    '%m/%d/%y',      # 01/15/24
                    '%d/%m/%y',      # 15/01/24
                ]
                
                for fmt in date_formats:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt)
                        break
                    except ValueError:
                        continue
                
                if not parsed_date:
                    skipped += 1
                    logger.warning(f"Row {idx+1}: Invalid date format '{date_str}', skipping")
                    continue
                
                # Parse amount (remove commas, currency symbols, handle negative)
                try:
                    amount_clean = str(amount_str).replace(',', '').replace('$', '').replace('€', '').replace('£', '').strip()
                    # Handle parentheses as negative (accounting format)
                    if amount_clean.startswith('(') and amount_clean.endswith(')'):
                        amount_clean = '-' + amount_clean[1:-1]
                    amount_value = float(amount_clean)
                except (ValueError, AttributeError) as e:
                    skipped += 1
                    logger.warning(f"Row {idx+1}: Invalid amount format '{amount_str}': {e}, skipping")
                    continue
            
                # Get currency and category
                currency_value = currency_default
                category_value = category or default_category
                description_value = description or ''
                
                # Insert transaction - match Prisma schema column names
                # Database columns: "orgId" (camelCase, quoted), raw_payload (snake_case, not quoted)
                try:
                    cursor.execute("""
                        INSERT INTO raw_transactions ("orgId", date, amount, currency, category, description, raw_payload)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        org_id,
                        parsed_date.date(),
                        amount_value,
                        currency_value,
                        category_value,
                        description_value,
                        json.dumps(row),
                    ))
                    inserted += 1
                    if inserted == 1 or inserted % 5 == 0:  # Log first row and every 5 rows
                        logger.info(f"Inserted row {inserted}: {parsed_date.date()} | ${amount_value} | {category_value}")
                    
                    # Update progress during import (50% to 95% range)
                    if total_rows > 0:
                        progress = 50 + int((inserted / total_rows) * 45)  # 50% to 95%
                        if inserted % 10 == 0 or inserted == 1:  # Update every 10 rows or on first row
                            logs_array.append({
                                'ts': datetime.now(timezone.utc).isoformat(),
                                'level': 'info',
                                'msg': f'Importing rows: {inserted}/{total_rows}',
                                'meta': {
                                    'status': 'importing',
                                    'progress': progress,
                                    'rows_imported': inserted,
                                    'rows_skipped': skipped
                                }
                            })
                            cursor.execute("""
                                UPDATE jobs SET progress = %s, logs = %s::jsonb, updated_at = NOW() WHERE id = %s
                            """, (progress, json.dumps(logs_array), job_id))
                            conn.commit()
                    
                    # Commit in batches to avoid losing all data if transaction is aborted
                    if inserted % BATCH_SIZE == 0:
                        conn.commit()
                        logger.info(f"Committed batch: {inserted} rows inserted so far")
                except Exception as insert_error:
                    # If transaction is aborted, rollback and start fresh
                    try:
                        conn.rollback()
                        logger.warning(f"Transaction aborted, rolled back. Continuing with next row...")
                    except:
                        pass  # Ignore rollback errors
                    
                    skipped += 1
                    error_msg = f"Row {idx+1}: Database insert failed: {str(insert_error)}"
                    errors.append(error_msg)
                    logger.error(f"Failed to insert row {idx+1} into database: {insert_error}")
                    logger.error(f"   Row data: date={parsed_date.date()}, amount={amount_value}, category={category_value}")
                    continue
                
            except Exception as e:
                skipped += 1
                error_msg = f"Row {idx+1}: {str(e)}"
                errors.append(error_msg)
                logger.warning(f"Failed to process row {idx+1}: {e}, row: {row}")
                continue
        
        logger.info(f"CSV import results: {inserted} inserted, {skipped} skipped, {len(errors)} errors")
        if errors:
            logger.warning(f"Import errors: {errors[:10]}")  # Log first 10 errors
        
        conn.commit()
        
        # Auto-map to chart of accounts (simple implementation)
        # TODO: Implement smart mapping logic
        
        # Update logs with completion - use logs_array we've been building
        logs_array.append({
            'ts': datetime.now(timezone.utc).isoformat(),
            'level': 'info',
            'msg': 'CSV import completed',
            'meta': {
                'status': 'completed',
                'progress': 100,
                'rows_imported': inserted,
                'rows_skipped': skipped,
                'errors': errors[:10] if errors else []
            }
        })
        
        cursor.execute("""
            UPDATE jobs SET progress = 100, status = 'done', logs = %s::jsonb, updated_at = NOW(), finished_at = NOW() WHERE id = %s
        """, (json.dumps(logs_array), job_id))
        conn.commit()
        
        logger.info(f"CSV import completed: {inserted} rows imported, {skipped} skipped")
        
        # Trigger auto-model run if transactions were imported
        if inserted > 0:
            try:
                logger.info(f"Auto-model: Triggering auto-model after CSV import ({inserted} rows imported)")
                
                # Extract initial values from params
                initial_cash = params.get('initialCash', 0)
                initial_customers = params.get('initialCustomers', 0)
                
                # Create auto-model trigger job
                # Note: params are stored in logs JSONB field, not as a separate column
                trigger_params = {
                    'triggerType': 'csv_import',
                    'triggerSource': job_id,
                    'rowsImported': inserted,
                    'cashOnHand': float(initial_cash),
                    'startingCustomers': int(initial_customers)
                }
                
                # Create logs array with params in meta (matching backend format)
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
                    job_id,  # Use CSV import job ID as trigger source
                    json.dumps(trigger_logs),
                ))
                conn.commit()
                logger.info(f"Auto-model trigger job created after CSV import with cash=${initial_cash}, customers={initial_customers}")
            except Exception as e:
                logger.warning(f"Failed to create auto-model trigger after CSV import: {str(e)}")
                # Don't fail the CSV import if auto-model trigger fails
        
    except Exception as e:
        logger.error(f"CSV import failed: {str(e)}", exc_info=True)
        raise
    finally:
        cursor.close()
        conn.close()

