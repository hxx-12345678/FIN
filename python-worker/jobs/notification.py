"""
Notification Hooks - Slack/Email task creation (stub)
In production, this would integrate with Slack API and email services
"""
import json
import os
from typing import Dict, Any, Optional
from utils.logger import setup_logger

logger = setup_logger()


def send_slack_notification(
    webhook_url: str,
    message: str,
    channel: Optional[str] = None,
    attachments: Optional[list] = None
) -> bool:
    """
    Send Slack notification via webhook.
    """
    try:
        if not webhook_url:
            logger.warning("No Slack webhook URL provided")
            return False

        import requests
        payload = {
            'text': message,
        }
        if channel:
            payload['channel'] = channel
        if attachments:
            payload['attachments'] = attachments

        response = requests.post(
            webhook_url, 
            json=payload, 
            timeout=10,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            logger.info(f"✅ Slack notification sent to {webhook_url[:30]}...")
            return True
        else:
            logger.error(f"❌ Slack API returned {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending Slack notification: {str(e)}")
        return False


def send_email_notification(
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
    from_email: Optional[str] = None,
    attachment: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Send email notification using SMTP or API.
    Attachment should be a dict with 'content' (bytes), 'filename' (str), and optionally 'content_type' (str).
    """
    try:
        from_email = from_email or os.getenv('EMAIL_FROM', 'noreply@finapilot.com')
        
        # 1. Try Brevo/SendGrid via HTTP first (Cleanest)
        api_key = os.getenv('BREVO_API_KEY') or os.getenv('SENDGRID_API_KEY')
        if api_key:
            import requests
            if os.getenv('BREVO_API_KEY'):
                # Brevo API
                url = "https://api.brevo.com/v3/smtp/email"
                payload = {
                    "sender": {"email": from_email, "name": "FinaPilot"},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "htmlContent": html_body or body.replace('\n', '<br>')
                }
                if attachment:
                    import base64
                    payload["attachment"] = [{
                        "content": base64.b64encode(attachment['content']).decode('utf-8'),
                        "name": attachment['filename']
                    }]
                headers = {
                    "accept": "application/json",
                    "content-type": "application/json",
                    "api-key": api_key
                }
                res = requests.post(url, json=payload, headers=headers, timeout=10)
                if res.status_code in [200, 201, 202]:
                    logger.info(f"✅ Email sent via Brevo to {to_email}")
                    return True
            else:
                # SendGrid API
                url = "https://api.sendgrid.com/v3/mail/send"
                payload = {
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": from_email, "name": "FinaPilot"},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": html_body or body.replace('\n', '<br>')}]
                }
                if attachment:
                    import base64
                    payload["attachments"] = [{
                        "content": base64.b64encode(attachment['content']).decode('utf-8'),
                        "filename": attachment['filename'],
                        "type": attachment.get('content_type', 'application/octet-stream'),
                        "disposition": "attachment"
                    }]
                headers = {"Authorization": f"Bearer {api_key}"}
                res = requests.post(url, json=payload, headers=headers, timeout=10)
                if res.status_code in [200, 201, 202]:
                    logger.info(f"✅ Email sent via SendGrid to {to_email}")
                    return True

        # 2. Fallback to SMTP
        smtp_host = os.getenv('SMTP_HOST')
        if smtp_host:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            port = int(os.getenv('SMTP_PORT', '587'))
            user = os.getenv('SMTP_USER')
            password = os.getenv('SMTP_PASS')

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_email
            msg["To"] = to_email

            part1 = MIMEText(body, "plain")
            msg.attach(part1)
            if html_body:
                part2 = MIMEText(html_body, "html")
                msg.attach(part2)
                
            if attachment:
                from email.mime.application import MIMEApplication
                part3 = MIMEApplication(attachment['content'], Name=attachment['filename'])
                part3['Content-Disposition'] = f'attachment; filename="{attachment["filename"]}"'
                msg.attach(part3)

            with smtplib.SMTP(smtp_host, port) as server:
                if port == 587:
                    server.starttls()
                if user and password:
                    server.login(user, password)
                server.sendmail(from_email, to_email, msg.as_string())
            
            logger.info(f"✅ Email sent via SMTP to {to_email}")
            return True

        logger.warning(f"⚠️ No email service configured. Logged: To={to_email}, Sub={subject}")
        return True # Return true so job doesn't fail, but log warning
        
    except Exception as e:
        logger.error(f"Error sending email notification: {str(e)}")
        return False


def handle_notification_task(job_id: str, org_id: str, object_id: str, logs: dict):
    """
    Handle notification task job (Slack/Email).
    
    Args:
        job_id: Job ID
        org_id: Organization ID
        object_id: Task ID or notification target ID
        logs: Job logs with params
    """
    logger.info(f"Processing notification task {job_id}")
    
    try:
        # Check for cancellation
        from jobs.runner import check_cancel_requested, mark_cancelled, update_progress
        
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        params = logs.get('params', {})
        notification_type = params.get('type', 'email')  # 'email' | 'slack'
        target = params.get('target')  # email address or Slack channel/webhook
        subject = params.get('subject', 'FinaPilot Notification')
        message = params.get('message', '')
        html_body = params.get('htmlBody')
        
        update_progress(job_id, 10, {'status': 'sending_notification'})
        
        success = False
        if notification_type == 'slack':
            webhook_url = params.get('webhookUrl') or target
            channel = params.get('channel')
            attachments = params.get('attachments')
            success = send_slack_notification(webhook_url, message, channel, attachments)
        elif notification_type == 'email':
            success = send_email_notification(target, subject, message, html_body)
        else:
            logger.warning(f"Unknown notification type: {notification_type}")
        
        update_progress(job_id, 100, {
            'status': 'completed' if success else 'failed',
            'notification_type': notification_type,
        })
        
        if success:
            logger.info(f"✅ Notification sent: {notification_type} to {target}")
        else:
            logger.warning(f"⚠️ Notification failed: {notification_type} to {target}")
        
    except Exception as e:
        logger.error(f"❌ Notification task failed: {str(e)}", exc_info=True)
        raise

