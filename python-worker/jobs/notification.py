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
    Send Slack notification via webhook (stub).
    
    Args:
        webhook_url: Slack webhook URL
        message: Message text
        channel: Optional channel override
        attachments: Optional attachments list
    
    Returns:
        True if sent successfully, False otherwise
    """
    try:
        # Stub: In production, use requests library to POST to webhook
        # import requests
        # response = requests.post(webhook_url, json={
        #     'text': message,
        #     'channel': channel,
        #     'attachments': attachments or []
        # })
        # return response.status_code == 200
        
        logger.info(f"[STUB] Slack notification sent: {message[:50]}...")
        return True
    except Exception as e:
        logger.error(f"Error sending Slack notification: {str(e)}")
        return False


def send_email_notification(
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
    from_email: Optional[str] = None
) -> bool:
    """
    Send email notification (stub).
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Plain text body
        html_body: Optional HTML body
        from_email: Optional sender email (defaults to env var)
    
    Returns:
        True if sent successfully, False otherwise
    """
    try:
        # Stub: In production, use email service (SendGrid, SES, etc.)
        # from_email = from_email or os.getenv('EMAIL_FROM', 'noreply@finapilot.com')
        # 
        # import sendgrid  # or boto3 for SES
        # sg = sendgrid.SendGridAPIClient(api_key=os.getenv('SENDGRID_API_KEY'))
        # message = {
        #     'personalizations': [{'to': [{'email': to_email}]}],
        #     'from': {'email': from_email},
        #     'subject': subject,
        #     'content': [
        #         {'type': 'text/plain', 'value': body},
        #         {'type': 'text/html', 'value': html_body or body}
        #     ]
        # }
        # response = sg.send(message)
        # return response.status_code in [200, 202]
        
        logger.info(f"[STUB] Email notification sent to {to_email}: {subject}")
        return True
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

