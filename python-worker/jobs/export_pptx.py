"""PowerPoint Export Job Handler with Slide Narration"""
import json
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.s3 import upload_bytes_to_s3
from utils.logger import setup_logger
from utils.timer import CPUTimer
from jobs.runner import check_cancel_requested, mark_cancelled, update_progress

logger = setup_logger()


def generate_slide_narration(slide_number: int, slide_title: str, slide_data: dict) -> str:
    """
    Generate narration text for a slide (placeholder for AI-generated narration).
    
    Args:
        slide_number: Slide number (1-based)
        slide_title: Title of the slide
        slide_data: Data for the slide
    
    Returns:
        Narration text as string
    """
    try:
        # Placeholder for AI-generated narration
        # In production, this would use an LLM to generate contextual narration
        narration = f"""Slide {slide_number}: {slide_title}

This slide presents key financial metrics and analysis. The data shows trends and patterns
that inform strategic decision-making. Key insights include revenue growth, expense management,
and cash flow projections.

[AI-generated narration placeholder - to be implemented with LLM integration]
"""
        return narration
    except Exception as e:
        logger.warning(f"Error generating slide narration: {str(e)}")
        return f"Slide {slide_number}: {slide_title}\n\n[Placeholder narration]"


def handle_export_pptx(job_id: str, org_id: str, object_id: str, logs: dict):
    """Handle PPTX export job with slide narration"""
    logger.info(f"Processing PPTX export job {job_id}")
    
    conn = None
    cursor = None
    cpu_timer = CPUTimer()
    
    try:
        # Check for cancellation
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        with cpu_timer:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            export_id = object_id
            if not export_id:
                export_id = logs.get('params', {}).get('exportId')
            
            if not export_id:
                raise ValueError("Export ID not found")
            
            # Get export record with model run summary
            # Note: Prisma uses camelCase (modelRunId) which needs to be quoted in PostgreSQL
            cursor.execute("""
                SELECT e.type, e."modelRunId", mr.summary_json
                FROM exports e
                LEFT JOIN model_runs mr ON e."modelRunId" = mr.id
                WHERE e.id = %s
            """, (export_id,))
            
            export_record = cursor.fetchone()
            if not export_record:
                raise ValueError(f"Export {export_id} not found")
            
            export_type = export_record[0]
            model_run_id = export_record[1]
            summary_json = export_record[2] if export_record[2] else {}
            
            if isinstance(summary_json, str):
                try:
                    summary_json = json.loads(summary_json)
                except:
                    summary_json = {}
            
            update_progress(job_id, 10, {'status': 'generating_slides'})
            
            # TODO: Implement PPTX generation using python-pptx
            # This is a placeholder
            try:
                from pptx import Presentation
                
                prs = Presentation()
                slide = prs.slides.add_slide(prs.slide_layouts[0])
                title = slide.shapes.title
                title.text = "FinaPilot Financial Report"
                
                # Generate slide narration (placeholder)
                narration_text = generate_slide_narration(1, "Financial Overview", summary_json)
                
                # Save narration to separate file
                narration_key = f"exports/{export_id}/slide_narration.txt"
                try:
                    upload_bytes_to_s3(narration_key, narration_text.encode('utf-8'), 'text/plain')
                except Exception as e:
                    logger.warning(f"Failed to upload narration: {str(e)}")
                
                # Save to bytes
                import io
                pptx_bytes = io.BytesIO()
                prs.save(pptx_bytes)
                pptx_bytes.seek(0)
                pptx_content = pptx_bytes.read()
            except ImportError:
                logger.warning("python-pptx not installed, using placeholder")
                pptx_content = b"PPTX placeholder content"
            
            update_progress(job_id, 80, {'status': 'uploading'})
            
            # Upload to S3
            pptx_key = f"exports/{export_id}/export.pptx"
            upload_bytes_to_s3(pptx_key, pptx_content, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
            
            # Get CPU time and estimate cost
            cpu_seconds = cpu_timer.elapsed()
            import os
            compute_cost_per_hour = float(os.getenv('COMPUTE_COST_PER_HOUR', '0.10'))
            estimated_cost = (cpu_seconds / 3600.0) * compute_cost_per_hour
            
            # Record billing usage
            try:
                bucket_time = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
                cursor.execute("""
                    INSERT INTO billing_usage ("orgId", metric, value, bucket_time)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (org_id, 'export_cpu_seconds', float(cpu_seconds), bucket_time))
                
                if estimated_cost > 0:
                    cursor.execute("""
                        INSERT INTO billing_usage ("orgId", metric, value, bucket_time)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (org_id, 'export_compute_cost', float(estimated_cost), bucket_time))
            except Exception as e:
                logger.warning(f"Error recording billing usage: {str(e)}")
            
            # Update export record
            cursor.execute("""
                UPDATE exports SET s3_key = %s WHERE id = %s
            """, (pptx_key, export_id))
            
            update_progress(job_id, 100, {
                'status': 'completed',
                'cpuSeconds': cpu_seconds,
                'estimatedCost': estimated_cost,
            })
            conn.commit()
            
            logger.info(f"✅ PPTX export {export_id} completed: {cpu_seconds:.2f}s CPU, ${estimated_cost:.4f} cost")
        
    except Exception as e:
        logger.error(f"❌ PPTX export failed: {str(e)}", exc_info=True)
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

