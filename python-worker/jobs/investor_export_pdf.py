"""
Investor PDF Export Job Handler
Generates professional investor memo PDF using WeasyPrint
Stores file in database instead of S3
"""

import json
import base64
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.logger import setup_logger
from utils.timer import CPUTimer
from utils.s3 import upload_bytes_to_s3
from jobs.runner import check_cancel_requested, mark_cancelled, update_progress
from utils.export_utils import (
    sanitize_summary_json,
    format_currency,
    format_percentage,
    generate_watermark_text,
    validate_export_data,
    truncate_text,
    safe_get_nested,
)

logger = setup_logger()


def generate_investor_pdf_html(org_name: str, summary_json: dict, monte_carlo_data: dict = None, is_demo: bool = False, is_free: bool = False) -> str:
    """
    Generate HTML for investor memo PDF.
    
    Args:
        org_name: Organization name
        summary_json: Model run summary
        monte_carlo_data: Optional Monte Carlo results
    
    Returns:
        HTML string
    """
    # Sanitize summary JSON
    summary_json = sanitize_summary_json(summary_json)
    
    total_revenue = safe_get_nested(summary_json, 'totalRevenue', default=0)
    total_expenses = safe_get_nested(summary_json, 'totalExpenses', default=0)
    net_income = safe_get_nested(summary_json, 'netIncome', default=0)
    cash_balance = safe_get_nested(summary_json, 'cashBalance', default=0)
    runway_months = safe_get_nested(summary_json, 'runwayMonths', default=0)
    burn_rate = safe_get_nested(summary_json, 'burnRate', default=0)
    
    # Compute color values for conditional styling (avoid f-string syntax errors)
    net_income_color = '#00aa00' if net_income >= 0 else '#cc0000'
    if runway_months < 6:
        runway_color = '#cc0000'
    elif runway_months >= 12:
        runway_color = '#00aa00'
    else:
        runway_color = '#ffa500'
    
    watermark_text = generate_watermark_text(is_demo, is_free)
    
    # Compute watermark HTML (avoid nested f-string issues)
    watermark_html = f'<div class="watermark">{watermark_text}</div>' if (is_demo or is_free) else ''
    
    # Get AI recommendations if available
    recommendations = summary_json.get('recommendations', [])
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 2cm;
            }}
            body {{
                font-family: 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }}
            .header {{
                border-bottom: 3px solid #0066cc;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }}
            .header h1 {{
                color: #0066cc;
                margin: 0;
                font-size: 28px;
            }}
            .header .subtitle {{
                color: #666;
                font-size: 14px;
                margin-top: 5px;
            }}
            .section {{
                margin-bottom: 30px;
            }}
            .section h2 {{
                color: #0066cc;
                border-bottom: 2px solid #e0e0e0;
                padding-bottom: 10px;
                margin-bottom: 15px;
            }}
            .metrics {{
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin: 20px 0;
            }}
            .metric {{
                background: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
            }}
            .metric-label {{
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                margin-bottom: 5px;
            }}
            .metric-value {{
                font-size: 24px;
                font-weight: bold;
                color: #0066cc;
            }}
            .recommendations {{
                background: #fff9e6;
                padding: 20px;
                border-left: 4px solid #ffa500;
                margin: 20px 0;
            }}
            .recommendations h3 {{
                margin-top: 0;
                color: #cc6600;
            }}
            .recommendation-item {{
                margin: 10px 0;
                padding-left: 20px;
            }}
            .footer {{
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                font-size: 12px;
                color: #666;
                text-align: center;
            }}
            .watermark {{
                position: fixed;
                bottom: 20px;
                right: 20px;
                font-size: 10px;
                color: #999;
                opacity: 0.5;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Investor Update — {org_name}</h1>
            <div class="subtitle">Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}</div>
        </div>
        
        <div class="section">
            <h2>Executive Summary</h2>
            <p>This investor update provides a comprehensive view of {org_name}'s financial position, 
            incorporating key assumptions and historical data to project future performance.</p>
        </div>
        
        <div class="section">
            <h2>Key Metrics</h2>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-label">Total Revenue</div>
                    <div class="metric-value">{format_currency(total_revenue)}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Total Expenses</div>
                    <div class="metric-value">{format_currency(total_expenses)}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Net Income</div>
                    <div class="metric-value" style="color: {net_income_color}">
                        {format_currency(net_income)}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Cash Balance</div>
                    <div class="metric-value">{format_currency(cash_balance)}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Monthly Burn Rate</div>
                    <div class="metric-value">{format_currency(burn_rate)}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Runway</div>
                    <div class="metric-value" style="color: {runway_color}">
                        {runway_months:.1f} months
                    </div>
                </div>
            </div>
        </div>
    """
    
    # Close the main f-string first, then add conditional content
    if monte_carlo_data:
        html += """
        <div class="section">
            <h2>Monte Carlo Risk Analysis</h2>
            <p>Probabilistic analysis shows:</p>
            <ul>
        """
        if 'percentiles' in monte_carlo_data:
            p10 = monte_carlo_data['percentiles'].get('p10', {})
            p50 = monte_carlo_data['percentiles'].get('p50', {})
            p90 = monte_carlo_data['percentiles'].get('p90', {})
            p10_cash = p10.get('cash', 0)
            p50_cash = p50.get('cash', 0)
            p90_cash = p90.get('cash', 0)
            html += f"""
                <li>P10 (Conservative): ${p10_cash:,.0f}</li>
                <li>P50 (Expected): ${p50_cash:,.0f}</li>
                <li>P90 (Optimistic): ${p90_cash:,.0f}</li>
            """
        html += """
            </ul>
        </div>
        """
    
    if recommendations:
        html += """
        <div class="recommendations">
            <h3>AI-CFO Recommendations</h3>
        """
        for rec in recommendations[:5]:  # Top 5 recommendations
            action = rec.get('action', 'N/A')
            priority = rec.get('priority', 'medium')
            html += f"""
            <div class="recommendation-item">
                <strong>[{priority.upper()}]</strong> {action}
            </div>
            """
        html += """
        </div>
        """
    
    html += f"""
        <div class="section">
            <h2>Key Risks & Considerations</h2>
            <ul>
                <li>Monitor cash runway closely, especially if below 6 months</li>
                <li>Review expense growth relative to revenue growth</li>
                <li>Consider scenario planning for different growth trajectories</li>
                <li>Maintain adequate working capital for operational needs</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>This report was generated automatically by FinaPilot AI-CFO</p>
            <p>For questions or additional analysis, please contact your finance team</p>
        </div>
        
        {watermark_html}
    </body>
    </html>
    """
    
    return html


def handle_investor_export_pdf(job_id: str, org_id: str, object_id: str, logs: dict):
    """Handle investor PDF export job - stores file in database"""
    logger.info(f"Processing investor PDF export job {job_id}")
    
    conn = None
    cursor = None
    cpu_timer = CPUTimer()
    
    try:
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        with cpu_timer:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            export_id = object_id
            if not export_id:
                # Handle logs as dict or list
                if isinstance(logs, dict):
                    export_id = logs.get('params', {}).get('exportId')
                elif isinstance(logs, list) and logs:
                    # Try to find exportId in list entries
                    for entry in logs:
                        if isinstance(entry, dict) and 'params' in entry:
                            export_id = entry.get('params', {}).get('exportId')
                            if export_id:
                                break
            
            if not export_id:
                raise ValueError("Export ID not found")
            
            # Extract params safely
            if isinstance(logs, dict):
                params = logs.get('params', {})
            elif isinstance(logs, list) and logs:
                # Find params in list
                params = {}
                for entry in reversed(logs):
                    if isinstance(entry, dict) and 'params' in entry:
                        params = entry.get('params', {})
                        break
            else:
                params = {}
            org_name = params.get('orgName', 'Organization')
            include_monte_carlo = params.get('includeMonteCarlo', True)
            direct_download = params.get('directDownload', True)
            is_demo = params.get('isDemo', False)
            is_free = params.get('isFree', False)
            
            # Update status
            try:
                cursor.execute("""
                    UPDATE exports SET status = 'processing', updated_at = NOW()
                    WHERE id = %s
                """, (export_id,))
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise
            
            update_progress(job_id, 10, {'status': 'fetching_data'})
            
            # Get export record with model run summary
            # Note: Column name in database is model_run_id (snake_case)
            cursor.execute("""
                SELECT e.type, e."modelRunId", mr.summary_json, mr."orgId", e."orgId"
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
            # Use orgId from export record or model run, fallback to function parameter
            export_org_id = export_record[4] or export_record[3] or org_id
            
            if isinstance(summary_json, str):
                try:
                    summary_json = json.loads(summary_json)
                except:
                    summary_json = {}
            
            # Handle empty summary JSON
            if not summary_json or summary_json == {}:
                logger.warning("Summary JSON is empty, using default values")
                summary_json = {
                    'totalRevenue': 0,
                    'totalExpenses': 0,
                    'netIncome': 0,
                    'cashBalance': 0,
                    'runwayMonths': 0,
                    'burnRate': 0
                }
            
            # Validate and sanitize summary JSON
            is_valid, errors = validate_export_data(summary_json)
            if not is_valid:
                logger.warning(f"Export data validation errors: {errors}")
            
            summary_json = sanitize_summary_json(summary_json)
            
            # Get Monte Carlo data if requested
            monte_carlo_data = None
            if include_monte_carlo and model_run_id:
                try:
                    cursor.execute("""
                        SELECT percentiles_json FROM monte_carlo_jobs
                        WHERE "modelRunId" = %s
                        AND status = 'done'
                        ORDER BY finished_at DESC
                        LIMIT 1
                    """, (model_run_id,))
                    mc_row = cursor.fetchone()
                    if mc_row and mc_row[0]:
                        if isinstance(mc_row[0], str):
                            monte_carlo_data = json.loads(mc_row[0])
                        else:
                            monte_carlo_data = mc_row[0]
                except Exception as e:
                    logger.warning(f"Could not fetch Monte Carlo data: {str(e)}")
                    # Rollback on SQL error to allow transaction to continue
                    try:
                        conn.rollback()
                    except:
                        pass
            
            update_progress(job_id, 30, {'status': 'generating_html'})
            
            # Generate HTML
            html_content = generate_investor_pdf_html(org_name, summary_json, monte_carlo_data, is_demo, is_free)
            
            update_progress(job_id, 50, {'status': 'generating_pdf'})
            
            # Generate PDF using WeasyPrint (with fallback to reportlab on Windows)
            try:
                from weasyprint import HTML
                from io import BytesIO
                
                pdf_buffer = BytesIO()
                HTML(string=html_content).write_pdf(pdf_buffer)
                pdf_content = pdf_buffer.getvalue()
                
            except (ImportError, OSError) as e:
                # WeasyPrint doesn't work on Windows without GTK+ runtime
                logger.warning(f"WeasyPrint not available ({type(e).__name__}: {str(e)}), using reportlab fallback")
                logger.warning("WeasyPrint not installed, trying reportlab fallback")
                try:
                    from reportlab.lib.pagesizes import letter
                    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
                    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                    from reportlab.lib import colors
                    from reportlab.lib.units import inch
                    from io import BytesIO
                    
                    buffer = BytesIO()
                    doc = SimpleDocTemplate(buffer, pagesize=letter)
                    styles = getSampleStyleSheet()
                    
                    # Custom styles
                    title_style = ParagraphStyle(
                        'CustomTitle',
                        parent=styles['Heading1'],
                        fontSize=24,
                        textColor=colors.HexColor('#2c3e50'),
                        spaceAfter=30,
                    )
                    
                    h2_style = ParagraphStyle(
                        'CustomH2',
                        parent=styles['Heading2'],
                        fontSize=18,
                        textColor=colors.HexColor('#34495e'),
                        spaceBefore=20,
                        spaceAfter=10,
                    )
                    
                    story = []
                    
                    # Title
                    story.append(Paragraph(f"Investor Update — {org_name}", title_style))
                    story.append(Spacer(1, 0.2*inch))
                    
                    # Meta info
                    story.append(Paragraph(f"<b>Generated:</b> {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}", styles['Normal']))
                    story.append(Spacer(1, 0.3*inch))
                    
                    # Executive Summary
                    story.append(Paragraph("Executive Summary", h2_style))
                    summary_text = f"This investor update provides a comprehensive view of {org_name}'s financial position, incorporating key assumptions and historical data to project future performance."
                    story.append(Paragraph(summary_text, styles['Normal']))
                    story.append(Spacer(1, 0.2*inch))
                    
                    # Key Metrics Table
                    story.append(Paragraph("Key Financial Metrics", h2_style))
                    
                    total_revenue = summary_json.get('totalRevenue', 0)
                    total_expenses = summary_json.get('totalExpenses', 0)
                    net_income = summary_json.get('netIncome', 0)
                    cash_balance = summary_json.get('cashBalance', 0)
                    burn_rate = summary_json.get('burnRate', 0)
                    runway_months = summary_json.get('runwayMonths', 0)
                    
                    data = [
                        ['Metric', 'Value', 'Status'],
                        ['Total Revenue', f"${total_revenue:,.0f}", ''],
                        ['Total Expenses', f"${total_expenses:,.0f}", ''],
                        ['Net Income', f"${net_income:,.0f}", 'Positive' if net_income >= 0 else 'Burn'],
                        ['Cash Balance', f"${cash_balance:,.0f}", ''],
                        ['Monthly Burn Rate', f"${burn_rate:,.0f}", 'High' if burn_rate > 50000 else 'Normal'],
                        ['Runway', f"{runway_months:.1f} months", 'Critical' if runway_months < 6 else 'Healthy']
                    ]
                    
                    t = Table(data, colWidths=[2.5*inch, 2.0*inch, 1.5*inch])
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ecf0f1')),
                        ('GRID', (0, 0), (-1, -1), 1, colors.white),
                    ]))
                    story.append(t)
                    story.append(Spacer(1, 0.3*inch))
                    
                    # Financial Health Analysis
                    story.append(Paragraph("Financial Health Analysis", h2_style))
                    
                    health_status = "Positive" if net_income >= 0 else "Negative (Operating at a loss)"
                    runway_status = "Healthy"
                    if runway_months < 6:
                        runway_status = "Critical - Less than 6 months remaining"
                    elif runway_months < 12:
                        runway_status = "Warning - Less than 12 months remaining"
                        
                    analysis_items = [
                        f"<b>Financial Health:</b> {health_status}",
                        f"<b>Runway Status:</b> {runway_status}",
                        f"<b>Cash Position:</b> ${cash_balance:,.0f} available"
                    ]
                    
                    for item in analysis_items:
                        story.append(Paragraph(f"• {item}", styles['Normal']))
                        story.append(Spacer(1, 0.05*inch))
                    
                    story.append(Spacer(1, 0.2*inch))
                    
                    # Recommendations if available
                    recommendations = summary_json.get('recommendations', [])
                    if recommendations and len(recommendations) > 0:
                        story.append(Paragraph("Key Recommendations", h2_style))
                        for i, rec in enumerate(recommendations[:5], 1):  # Limit to 5 recommendations
                            rec_text = rec.get('title', rec.get('text', str(rec)))
                            story.append(Paragraph(f"{i}. {rec_text}", styles['Normal']))
                            story.append(Spacer(1, 0.05*inch))
                    
                    doc.build(story)
                    pdf_content = buffer.getvalue()
                    
                except ImportError:
                    logger.error("Neither WeasyPrint nor reportlab installed")
                    raise ValueError("PDF generation library not available. Install WeasyPrint: pip install weasyprint")
            
            update_progress(job_id, 90, {'status': 'storing_file'})
            
            # Get CPU time
            cpu_seconds = cpu_timer.elapsed()
            
            # Upload PDF to S3 and update export record
            try:
                # Generate S3 key for export
                s3_key = f"exports/{export_org_id}/{export_id}/investor-memo.pdf"
                
                # Upload to S3
                uploaded_key = upload_bytes_to_s3(
                    key=s3_key,
                    data=pdf_content,
                    content_type='application/pdf'
                )
                
                if uploaded_key:
                    # Update export with S3 key
                    cursor.execute("""
                        UPDATE exports 
                        SET s3_key = %s, status = 'completed', updated_at = NOW()
                        WHERE id = %s
                    """, (uploaded_key, export_id))
                else:
                    # S3 not configured, store in database as fallback
                    logger.warning("S3 not configured, storing PDF in database as fallback")
                    cursor.execute("""
                        UPDATE exports 
                        SET file_data = %s, status = 'completed', updated_at = NOW()
                        WHERE id = %s
                    """, (pdf_content, export_id))
                
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise
            
            update_progress(job_id, 100, {
                'status': 'completed',
                'cpuSeconds': cpu_seconds,
                'fileSize': len(pdf_content),
            })
            
            logger.info(f"✅ Investor PDF export {export_id} completed: {len(pdf_content)} bytes, {cpu_seconds:.2f}s CPU")
        
    except Exception as e:
        logger.error(f"❌ Investor PDF export failed: {str(e)}", exc_info=True)
        
        # Update status to failed
        if conn and cursor:
            try:
                cursor.execute("""
                    UPDATE exports SET status = 'failed', updated_at = NOW()
                    WHERE id = %s
                """, (export_id,))
                conn.commit()
            except:
                pass
        
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


