import json
import os
from datetime import datetime, timezone
from typing import Dict, Any, List
from utils.db import get_db_connection
from utils.logger import setup_logger
from jobs.runner import update_progress, complete_job, fail_job

logger = setup_logger()

def handle_alert_check(job_id: str, org_id: str, object_id: str, params: Dict[str, Any]):
    """
    Check alerts for an organization against a model run result.
    Triggered after model run or Monte Carlo simulation.
    """
    logger.info(f"Processing alert check job {job_id} for org {org_id}, model_run {object_id}")
    
    model_run_id = object_id
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        update_progress(job_id, 10, {'status': 'fetching_alerts'})
        
        # 1. Fetch active alerts for the organization
        cursor.execute("""
            SELECT id, metric, operator, threshold, notify_email, notify_slack, slack_webhook
            FROM alert_rules
            WHERE org_id = %s AND enabled = true
        """, (org_id,))
        
        alerts = cursor.fetchall()
        
        if not alerts:
            logger.info(f"No active alerts found for org {org_id}")
            complete_job(job_id, {'status': 'done', 'alerts_checked': 0, 'alerts_triggered': 0})
            return

        # 2. Fetch model run summary stats
        # Try to get summary_json or percentiles_json depending on context
        cursor.execute("""
            SELECT summary_json, run_type 
            FROM model_runs 
            WHERE id = %s
        """, (model_run_id,))
        
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Model run {model_run_id} not found")
            
        summary_json = row[0]
        
        # If summary is null (e.g., Monte Carlo run), try fetching monte_carlo_jobs result
        # But usually MC updates model run or has its own result.
        # For now, we assume summary_json contains the key metrics.
        
        metrics = {}
        if summary_json and isinstance(summary_json, dict):
            metrics = summary_json.get('metrics', {})
            
        # Add Monte Carlo metrics if available
        # Check if there's a completed MC job for this run
        cursor.execute("""
            SELECT percentiles_json 
            FROM monte_carlo_jobs 
            WHERE "modelRunId" = %s AND status = 'done' 
            ORDER BY created_at DESC LIMIT 1
        """, (model_run_id,))
        
        mc_row = cursor.fetchone()
        if mc_row and mc_row[0]:
            mc_data = mc_row[0]
            if isinstance(mc_data, dict):
                # Extract useful MC metrics like 'survival_probability'
                if 'survival_probability' in mc_data:
                     metrics['survival_probability'] = mc_data['survival_probability']['overall']['probabilitySurvivingFullPeriod']
        
        logger.info(f"Evaluated metrics: {metrics.keys()}")
        
        triggered_alerts = []
        
        # 3. Evaluate alerts
        for alert in alerts:
            alert_id, metric_name, operator, threshold_value, notify_email, notify_slack, webhook = alert
            threshold_value = float(threshold_value)
            
            # Build delivery channels list from boolean flags
            channels = []
            if notify_email:
                channels.append('email')
            if notify_slack:
                channels.append('slack')
            
            # Get metric value (nested lookup supported e.g. "pnl.netIncome")
            metric_val = metrics.get(metric_name)
            
            # Try nested lookup if not found directly
            if metric_val is None and '.' in metric_name:
                parts = metric_name.split('.')
                curr = metrics
                for part in parts:
                    if isinstance(curr, dict):
                        curr = curr.get(part)
                    else:
                        curr = None
                        break
                if curr is not None:
                    metric_val = curr

            if metric_val is None:
                logger.debug(f"Metric {metric_name} not found in results, skipping alert {alert_id}")
                continue
                
            try:
                metric_val = float(metric_val)
            except (ValueError, TypeError):
                logger.warning(f"Metric {metric_name} value {metric_val} is not numeric")
                continue
            
            triggered = False
            if operator == '>' and metric_val > threshold_value:
                triggered = True
            elif operator == '>=' and metric_val >= threshold_value:
                triggered = True
            elif operator == '<' and metric_val < threshold_value:
                triggered = True
            elif operator == '<=' and metric_val <= threshold_value:
                triggered = True
            elif operator == '==' and metric_val == threshold_value:
                triggered = True
            
            if triggered:
                logger.info(f"Alert {alert_id} triggered! {metric_name} ({metric_val}) {operator} {threshold_value}")
                triggered_alerts.append({
                    'alert_id': alert_id,
                    'metric': metric_name,
                    'value': metric_val,
                    'threshold': threshold_value,
                    'channels': channels
                })
                
                # Record last triggered time
                cursor.execute("""
                    UPDATE alert_rules 
                    SET last_triggered = NOW() 
                    WHERE id = %s
                """, (alert_id,))
                
                # Deliver alert
                deliver_alert(conn, cursor, org_id, alert_id, metric_name, metric_val, threshold_value, operator, channels, webhook)

        conn.commit()
        complete_job(job_id, {
            'status': 'done', 
            'alerts_checked': len(alerts), 
            'alerts_triggered': len(triggered_alerts),
            'triggered_details': triggered_alerts
        })
        
    except Exception as e:
        logger.error(f"Error processing alert check job {job_id}: {str(e)}", exc_info=True)
        fail_job(job_id, e)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def deliver_alert(conn, cursor, org_id, alert_id, metric, value, threshold, operator, channels, webhook):
    """
    Deliver alert and create persistent notification record.
    """
    # 1. Fetch alert details including severity and creator
    cursor.execute("""
        SELECT name, severity, created_by_id, slack_webhook
        FROM alert_rules 
        WHERE id = %s
    """, (alert_id,))
    
    row = cursor.fetchone()
    if not row:
        return
        
    alert_name, severity, created_by_id, slack_webhook = row
    
    title = f"Alert: {alert_name}"
    display_msg = f"{metric} is {value} ({operator} {threshold})"
    
    # 1. Persist to notifications table
    try:
        cursor.execute("""
            INSERT INTO notifications (
                id, "orgId", "userId", type, title, message, category, priority, read, created_at
            ) VALUES (
                gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, NOW()
            )
        """, (
            org_id,
            created_by_id,
            'alert',
            title,
            display_msg,
            'financial',
            'high' if severity == 'critical' else 'medium',
            False
        ))
        conn.commit()
    except Exception as e:
        logger.error(f"Failed to persist notification: {str(e)}")

    # 2. External Delivery
    from jobs.notification import send_email_notification, send_slack_notification
    
    # Fetch user email if needed
    user_email = None
    if created_by_id:
        cursor.execute("SELECT email FROM users WHERE id = %s", (created_by_id,))
        res = cursor.fetchone()
        if res:
            user_email = res[0]

    # Email Delivery
    if 'email' in channels or severity == 'critical':
        if user_email:
            send_email_notification(
                to_email=user_email,
                subject=f"[FinaPilot] {title}",
                body=f"Intelligence Alert Triggered\n\n{display_msg}\n\nSeverity: {severity}\nTime: {datetime.now().isoformat()}",
                html_body=f"<h3>Intelligence Alert Triggered</h3><p><b>{display_msg}</b></p><p>Severity: {severity}</p>"
            )
        else:
            logger.warning(f"Unable to send email: No email found for user {created_by_id}")

    # Slack Delivery
    if 'slack' in channels:
        webhook_url = slack_webhook or webhook
        if not webhook_url:
            # Webhook should be in alert_rules already, or fallback to default
            pass
        
        if webhook_url:
            icon = "🚨" if severity == "critical" else "⚠️"
            send_slack_notification(
                webhook_url=webhook_url,
                message=f"{icon} *FinaPilot Intelligence Alert*\n\n*Rule:* {alert_name}\n*Message:* {display_msg}\n*Severity:* {severity}"
            )
        else:
            logger.warning(f"Unable to send Slack: No webhook found for org {org_id}")

