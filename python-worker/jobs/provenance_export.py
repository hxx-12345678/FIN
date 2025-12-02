"""
Provenance Export Job Handler
Creates a comprehensive export package for provenance data
"""
import json
import csv
import zipfile
import io
from typing import Dict, List, Optional
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.s3 import upload_bytes_to_s3, get_signed_url
from utils.logger import setup_logger

logger = setup_logger()


def handle_provenance_export(job_id: str, org_id: str, object_id: str, logs: dict):
    """
    Handle provenance export job.
    
    Creates a zip file containing:
    - provenance.json (full provenance entries)
    - transactions.csv (related transactions)
    - prompts.json (related prompts)
    - provenance_report.pdf (if PDF format requested)
    """
    logger.info(f"Processing provenance export job {job_id}")
    
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get job parameters
        params = logs.get('params', {})
        model_run_id = params.get('modelRunId') or object_id
        format_type = params.get('format', 'json')
        include_transactions = params.get('includeTransactions', True)
        
        if not model_run_id:
            raise ValueError("modelRunId not found in job params")
        
        # Update job status
        cursor.execute("""
            UPDATE jobs
            SET status = 'running', progress = 10, updated_at = NOW()
            WHERE id = %s
        """, (job_id,))
        conn.commit()
        
        # Get all provenance entries for this model run
        cursor.execute("""
            SELECT 
                pe.id, pe."cell_key", pe."source_type", pe."source_ref",
                pe."promptId", pe."confidence_score", pe."created_at",
                p."rendered_prompt", p."response_text", p."provider", p."model_used"
            FROM provenance_entries pe
            LEFT JOIN prompts p ON pe."promptId" = p.id
            WHERE pe."modelRunId" = %s
            ORDER BY pe."created_at" DESC
        """, (model_run_id,))
        
        provenance_rows = cursor.fetchall()
        
        logger.info(f"Found {len(provenance_rows)} provenance entries")
        
        # Update progress
        cursor.execute("""
            UPDATE jobs
            SET progress = 30, updated_at = NOW()
            WHERE id = %s
        """, (job_id,))
        conn.commit()
        
        # Collect all transaction IDs
        transaction_ids = set()
        for row in provenance_rows:
            source_ref = row[3]  # source_ref column
            if source_ref and row[2] == 'txn':  # source_type == 'txn'
                try:
                    ref_data = json.loads(source_ref) if isinstance(source_ref, str) else source_ref
                    if isinstance(ref_data, list):
                        for item in ref_data:
                            if isinstance(item, str):
                                transaction_ids.add(item)
                            elif isinstance(item, dict) and 'id' in item:
                                transaction_ids.add(item['id'])
                except:
                    pass
        
        # Get transactions if requested
        transactions = []
        if include_transactions and transaction_ids:
            cursor.execute("""
                SELECT id, date, amount, currency, category, description, "source_id"
                FROM raw_transactions
                WHERE id = ANY(%s::uuid[])
                ORDER BY date DESC
            """, (list(transaction_ids),))
            
            transactions = cursor.fetchall()
            logger.info(f"Found {len(transactions)} related transactions")
        
        # Update progress
        cursor.execute("""
            UPDATE jobs
            SET progress = 60, updated_at = NOW()
            WHERE id = %s
        """, (job_id,))
        conn.commit()
        
        # Collect prompt IDs
        prompt_ids = set()
        for row in provenance_rows:
            prompt_id = row[4]  # promptId column
            if prompt_id:
                prompt_ids.add(prompt_id)
        
        # Get prompts
        prompts = []
        if prompt_ids:
            cursor.execute("""
                SELECT id, "prompt_template", "rendered_prompt", "response_text",
                       provider, "model_used", "tokens_used", created_at
                FROM prompts
                WHERE id = ANY(%s::uuid[])
                ORDER BY created_at DESC
            """, (list(prompt_ids),))
            
            prompts = cursor.fetchall()
            logger.info(f"Found {len(prompts)} related prompts")
        
        # Update progress
        cursor.execute("""
            UPDATE jobs
            SET progress = 80, updated_at = NOW()
            WHERE id = %s
        """, (job_id,))
        conn.commit()
        
        # Build export package
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # 1. Provenance JSON
            provenance_data = []
            for row in provenance_rows:
                entry = {
                    'id': str(row[0]),
                    'cell_key': row[1],
                    'source_type': row[2],
                    'source_ref': json.loads(row[3]) if isinstance(row[3], str) else row[3],
                    'prompt_id': str(row[4]) if row[4] else None,
                    'confidence_score': float(row[5]) if row[5] else None,
                    'created_at': row[6].isoformat() if row[6] else None,
                }
                provenance_data.append(entry)
            
            zip_file.writestr(
                'provenance.json',
                json.dumps(provenance_data, indent=2, default=str)
            )
            
            # 2. Transactions CSV
            if transactions:
                csv_buffer = io.StringIO()
                writer = csv.writer(csv_buffer)
                writer.writerow([
                    'id', 'date', 'amount', 'currency', 'category', 'description', 'source_id'
                ])
                
                for txn in transactions:
                    writer.writerow([
                        str(txn[0]),  # id
                        txn[1].isoformat() if txn[1] else '',  # date
                        str(txn[2]),  # amount
                        txn[3] or '',  # currency
                        txn[4] or '',  # category
                        txn[5] or '',  # description
                        txn[6] or '',  # source_id
                    ])
                
                zip_file.writestr('transactions.csv', csv_buffer.getvalue())
            
            # 3. Prompts JSON
            if prompts:
                prompts_data = []
                for row in prompts:
                    prompt = {
                        'id': str(row[0]),
                        'prompt_template': row[1],
                        'rendered_prompt': row[2],
                        'response_text': row[3],
                        'provider': row[4],
                        'model_used': row[5],
                        'tokens_used': row[6],
                        'created_at': row[7].isoformat() if row[7] else None,
                    }
                    prompts_data.append(prompt)
                
                zip_file.writestr(
                    'prompts.json',
                    json.dumps(prompts_data, indent=2, default=str)
                )
            
            # 4. Metadata
            metadata = {
                'model_run_id': model_run_id,
                'exported_at': datetime.now(timezone.utc).isoformat(),
                'format': format_type,
                'include_transactions': include_transactions,
                'provenance_count': len(provenance_data),
                'transaction_count': len(transactions),
                'prompt_count': len(prompts),
            }
            zip_file.writestr(
                'metadata.json',
                json.dumps(metadata, indent=2, default=str)
            )
        
        zip_buffer.seek(0)
        zip_data = zip_buffer.read()
        
        # Upload to S3
        s3_key = f"provenance-exports/{org_id}/{model_run_id}/{job_id}.zip"
        upload_bytes_to_s3(s3_key, zip_data, 'application/zip')
        
        logger.info(f"Uploaded provenance export to S3: {s3_key}")
        
        # Get signed URL
        from utils.s3 import get_signed_url
        signed_url = get_signed_url(s3_key, expires_in=3600 * 24 * 7)  # 7 days
        
        # Update job status
        cursor.execute("""
            UPDATE jobs
            SET status = 'done', progress = 100, updated_at = NOW(),
                logs = %s::jsonb
            WHERE id = %s
        """, (json.dumps({
            **logs,
            'status': 'completed',
            's3_key': s3_key,
            'signed_url': signed_url,
            'exported_at': datetime.now(timezone.utc).isoformat(),
        }), job_id))
        conn.commit()
        
        logger.info(f"✅ Provenance export job {job_id} completed")
        
    except Exception as e:
        logger.error(f"❌ Provenance export job failed: {str(e)}", exc_info=True)
        
        if conn and cursor:
            try:
                cursor.execute("""
                    UPDATE jobs
                    SET status = 'failed', updated_at = NOW(),
                        logs = %s::jsonb
                    WHERE id = %s
                """, (json.dumps({
                    **logs,
                    'error': str(e),
                    'failed_at': datetime.now(timezone.utc).isoformat(),
                }), job_id))
                conn.commit()
            except:
                pass
        
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

