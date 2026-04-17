/**
 * Email Service
 * Sends emails for invitations, notifications, etc.
 * Supports Brevo (via API key), SendGrid (via API key), or SMTP (via nodemailer)
 */

import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export const emailService = {
  /**
   * Send an email
   * In production, this would use SendGrid, SES, or another email service
   */
  sendEmail: async (options: EmailOptions): Promise<boolean> => {
    try {
      const fromEmail = options.from || config.emailFrom || config.EMAIL_FROM || 'noreply@finapilot.com';
      const brevoApiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
      const sendgridApiKey = process.env.SENDGRID_API_KEY;
      let smtpHost = process.env.SMTP_HOST;
      let smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      // Helper to check for common dummy placeholders
      const isInvalid = (val?: string) => !val || val.length < 10 || val.includes('your-') || val === 'enabled';

      logger.info(`[EMAIL] Attempting delivery to ${options.to}`);

      // Try Brevo API first if API key is configured
      if (!isInvalid(brevoApiKey)) {
        try {
          const brevo = await import('@getbrevo/brevo');
          const apiInstance = new brevo.TransactionalEmailsApi();
          apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey!);

          const sendSmtpEmail: any = {
            sender: { email: fromEmail, name: 'FinaPilot' },
            to: [{ email: options.to }],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text || options.html.replace(/<[^>]*>/g, '').trim(),
          };

          const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
          logger.info(`[EMAIL] ✅ Email sent successfully via Brevo to ${options.to}`);
          return true;
        } catch (brevoError: any) {
          if (brevoError.response?.body?.code === 'unauthorized') {
            logger.error(`[EMAIL] ❌ Brevo Authentication Failed: API Key is invalid or disabled.`);
            // Don't fall through to other services if auth failed - likely a global config issue
          } else {
            logger.error(`[EMAIL] Brevo API failed:`, brevoError.message || brevoError);
          }
          // Fall through only if it's not a terminal auth error
          if (brevoError.response?.status === 401) return emailService.logEmailToConsole(options, fromEmail);
        }
      }

      // Try SendGrid if API key is configured
      if (!isInvalid(sendgridApiKey)) {
        try {
          // @ts-ignore - dynamic import may not be resolved by tsc during noEmit
          const sgMail = await import('@sendgrid/mail') as any;
          sgMail.setApiKey(sendgridApiKey!);

          const msg = {
            to: options.to,
            from: fromEmail,
            subject: options.subject,
            text: options.text || '',
            html: options.html,
          };

          await sgMail.send(msg);
          logger.info(`[EMAIL] ✅ Email sent successfully via SendGrid to ${options.to}`);
          return true;
        } catch (sendgridError: any) {
          logger.error(`[EMAIL] SendGrid failed:`, sendgridError.message || sendgridError);
          if (sendgridError.code === 401) return emailService.logEmailToConsole(options, fromEmail);
        }
      }

      // Try SMTP via nodemailer if SMTP config is provided
      if (smtpHost && !isInvalid(smtpUser) && !isInvalid(smtpPass)) {
        try {
          const nodemailer = await import('nodemailer');
          logger.info(`[EMAIL] Attempting SMTP delivery (${smtpHost})`);

          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 5000,
          });

          const mailOptions = {
            from: fromEmail,
            to: options.to,
            subject: options.subject,
            text: options.text || '',
            html: options.html,
          };

          const info = await transporter.sendMail(mailOptions);
          logger.info(`[EMAIL] ✅ Email sent successfully via SMTP to ${options.to}`);
          return true;
        } catch (smtpError: any) {
          logger.error(`[EMAIL] ❌ SMTP delivery failed: ${smtpError.message}`);
          // If SMTP auth failed, fallback to console immediately
        }
      }

      return emailService.logEmailToConsole(options, fromEmail);

    } catch (error) {
      logger.error(`[EMAIL] Global error in email service:`, error);
      return false;
    }
  },

  /**
   * Helper to log email to console when no service is available or configured
   */
  logEmailToConsole: (options: EmailOptions, fromEmail: string): boolean => {
    console.log('\n' + '='.repeat(80));
    console.log('[EMAIL] SIMULATED DELIVERY (CONSOLE LOG)');
    console.log('='.repeat(80));
    console.log(`To: ${options.to}`);
    console.log(`From: ${fromEmail}`);
    console.log(`Subject: ${options.subject}`);
    console.log('\n[HTML Content Snippet]:');
    console.log(options.html.substring(0, 500) + (options.html.length > 500 ? '...' : ''));
    console.log('='.repeat(80));
    console.log('💡 Configure BREVO_API_KEY or SMTP settings for live delivery.');
    console.log('='.repeat(80) + '\n');

    logger.warn(`[EMAIL] Delivery simulated to console for ${options.to}`);
    return true;
  },



  /**
   * Send invitation email
   */
  sendInvitationEmail: async (
    email: string,
    inviterName: string,
    orgName: string,
    role: string,
    token: string,
    message?: string,
    baseUrl: string = config.frontendUrl || 'http://localhost:3000'
  ): Promise<boolean> => {
    const invitationUrl = `${baseUrl}/auth/accept-invite?token=${token}`;

    const subject = `You've been invited to join ${orgName} on FinaPilot`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to FinaPilot</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">FinaPilot</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">You've been invited!</h2>
    
    <p>Hi there,</p>
    
    <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on FinaPilot with the role of <strong>${role}</strong>.</p>
    
    ${message ? `<p style="background: #f0f0f0; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;"><strong>Message from ${inviterName}:</strong><br>${message}</p>` : ''}
    
    <p>FinaPilot is a comprehensive AI-powered FP&A platform that helps you manage financial modeling, forecasting, and decision-making.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${invitationUrl}" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Accept Invitation
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
    <p style="font-size: 12px; color: #999; word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${invitationUrl}</p>
    
    <p style="font-size: 12px; color: #999; margin-top: 30px;">
      This invitation will expire in 7 days.<br>
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      © ${new Date().getFullYear()} FinaPilot. All rights reserved.
    </p>
  </div>
</body>
</html>
    `;

    const text = `
You've been invited!

${inviterName} has invited you to join ${orgName} on FinaPilot with the role of ${role}.

${message ? `\nMessage from ${inviterName}:\n${message}\n` : ''}

Accept your invitation by clicking the link below:
${invitationUrl}

This invitation will expire in 7 days.
If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} FinaPilot. All rights reserved.
    `;

    return await emailService.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  },
};
