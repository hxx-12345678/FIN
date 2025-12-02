"""CSV Export Job Handler"""
import csv
import json
import io
from utils.db import get_db_connection
from utils.s3 import upload_bytes_to_s3
from utils.logger import setup_logger

logger = setup_logger()

def handle_export_csv(job_id: str, org_id: str, object_id: str, logs: dict):
    """Handle CSV export job"""
    logger.info(f"Processing CSV export job {job_id}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        export_id = object_id
        if not export_id:
            export_id = logs.get('params', {}).get('exportId')
        
        if not export_id:
            raise ValueError("Export ID not found")
        
        # Get export record and model run data
        cursor.execute("""
            SELECT e."modelRunId", mr.summary_json
            FROM exports e
            LEFT JOIN model_runs mr ON e."modelRunId" = mr.id
            WHERE e.id = %s
        """, (export_id,))
        
        export_record = cursor.fetchone()
        if not export_record:
            raise ValueError(f"Export {export_id} not found")
        
        cursor.execute("""
            UPDATE jobs SET progress = 30, logs = %s WHERE id = %s
        """, (json.dumps({**logs, 'status': 'generating_csv'}), job_id))
        conn.commit()
        
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Metric', 'Value'])
        
        # Write data from summary_json
        if export_record[1]:  # summary_json
            summary = json.loads(export_record[1]) if isinstance(export_record[1], str) else export_record[1]
            for key, value in summary.items():
                writer.writerow([key, value])
        
        csv_content = output.getvalue().encode('utf-8')
        
        # Try to upload to S3, fallback to database storage
        import os
        s3_bucket = os.getenv('S3_BUCKET_NAME')
        csv_key = None
        
        if s3_bucket:
            try:
                csv_key = f"exports/{export_id}/export.csv"
                upload_bytes_to_s3(csv_key, csv_content, 'text/csv')
                logger.info(f"CSV uploaded to S3: {csv_key}")
            except Exception as e:
                logger.warning(f"Failed to upload CSV to S3: {str(e)}, storing in database instead")
                csv_key = None
        else:
            logger.info("S3_BUCKET_NAME not set, storing CSV in database")
        
        # Update export record - use S3 if available, otherwise store in database
        if csv_key:
            cursor.execute("""
                UPDATE exports SET s3_key = %s, status = 'completed', updated_at = NOW() WHERE id = %s
            """, (csv_key, export_id))
        else:
            # S3 not configured, store in database as fallback
            logger.warning("S3 not configured, storing CSV in database as fallback")
            cursor.execute("""
                UPDATE exports SET file_data = %s, status = 'completed', updated_at = NOW() WHERE id = %s
            """, (csv_content.encode('utf-8'), export_id))
        
        cursor.execute("""
            UPDATE jobs SET progress = 100, logs = %s WHERE id = %s
        """, (json.dumps({**logs, 'status': 'completed'}), job_id))
        conn.commit()
        
        logger.info(f"✅ CSV export {export_id} completed")
        
    except Exception as e:
        logger.error(f"❌ CSV export failed: {str(e)}", exc_info=True)
        raise
    finally:
        cursor.close()
        conn.close()

