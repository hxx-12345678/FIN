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
      
      logger.info(`[EMAIL] Sending email to ${options.to}`);
      logger.info(`[EMAIL] Subject: ${options.subject}`);
      logger.info(`[EMAIL] From: ${fromEmail}`);
      
      // Try Brevo API first if API key is configured (highest priority)
      if (brevoApiKey) {
        try {
          const brevo = await import('@getbrevo/brevo');
          const apiInstance = new brevo.TransactionalEmailsApi();
          // Set API key - Brevo SDK uses authentications.apiKey.apiKey
          (apiInstance as any).authentications = {
            apiKey: { apiKey: brevoApiKey }
          };
          
          const sendSmtpEmail: any = {
            sender: { email: fromEmail, name: 'FinaPilot' },
            to: [{ email: options.to }],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text || options.html.replace(/<[^>]*>/g, '').trim(),
          };
          
          const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
          logger.info(`[EMAIL] ✅ Email sent successfully via Brevo to ${options.to} - Message ID: ${result.body.messageId}`);
          logger.info(`[EMAIL] Email accepted by Brevo. Recipient should receive email shortly.`);
          return true;
        } catch (brevoError: any) {
          logger.error(`[EMAIL] Brevo API failed:`, brevoError);
          if (brevoError.response?.body) {
            const errorBody = brevoError.response.body;
            logger.error(`[EMAIL] Brevo Error Details:`, errorBody);
            
            // Provide specific guidance for common errors
            if (errorBody.code === 'unauthorized' || errorBody.message?.includes('API Key is not enabled')) {
              logger.error(`[EMAIL] ❌ Brevo API Key is not enabled or invalid.`);
              logger.error(`[EMAIL] ⚠️  Please check your Brevo dashboard:`);
              logger.error(`[EMAIL]    1. Go to https://app.brevo.com → Settings → API Keys`);
              logger.error(`[EMAIL]    2. Verify your API key is ENABLED`);
              logger.error(`[EMAIL]    3. Ensure it has "Send emails" permissions`);
              logger.error(`[EMAIL]    4. If disabled, enable it or create a new API key`);
            }
          }
          // Fall through to SendGrid or SMTP
        }
      }
      
      // Try SendGrid if API key is configured
      if (sendgridApiKey) {
        try {
          const sgMail = await import('@sendgrid/mail') as any;
          sgMail.setApiKey(sendgridApiKey);
          
          const msg = {
            to: options.to,
            from: fromEmail,
            subject: options.subject,
            text: options.text || '',
            html: options.html,
          };
          
          await sgMail.send(msg);
          logger.info(`[EMAIL] Email sent successfully via SendGrid to ${options.to}`);
          return true;
        } catch (sendgridError: any) {
          logger.error(`[EMAIL] SendGrid failed, trying fallback:`, sendgridError);
          // Fall through to SMTP or console logging
        }
      }
      
      // Try SMTP via nodemailer if SMTP config is provided
      if (smtpHost && smtpUser && smtpPass) {
        try {
          const nodemailer = await import('nodemailer');
          
          logger.info(`[EMAIL] Attempting to send via SMTP (${smtpHost}:${smtpPort})`);
          
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for other ports
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            // Add timeout to prevent hanging
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 5000, // 5 seconds
            socketTimeout: 10000, // 10 seconds
          });
          
          // Verify SMTP connection before sending
          await transporter.verify();
          logger.info(`[EMAIL] SMTP connection verified successfully`);
          
          const mailOptions = {
            from: fromEmail,
            to: options.to,
            subject: options.subject,
            text: options.text || '',
            html: options.html,
          };
          
          const info = await transporter.sendMail(mailOptions);
          logger.info(`[EMAIL] ✅ Email sent successfully via SMTP to ${options.to} - Message ID: ${info.messageId}`);
          logger.info(`[EMAIL] Email accepted by SMTP server. Recipient should receive email shortly.`);
          return true;
        } catch (smtpError: any) {
          logger.error(`[EMAIL] SMTP failed:`, smtpError);
          logger.error(`[EMAIL] SMTP Error Details:`, {
            message: smtpError.message,
            code: smtpError.code,
            command: smtpError.command,
            response: smtpError.response,
            responseCode: smtpError.responseCode,
          });
          // Fall through to console logging if SMTP fails
          // Don't silently fail - we want to know if SMTP is misconfigured
        }
      }
      
      // Fallback: Log to console for development/testing
      console.log('\n' + '='.repeat(80));
      console.log('[EMAIL] SENDING EMAIL (CONSOLE LOG - NO BREVO/SENDGRID/SMTP CONFIGURED)');
      console.log('='.repeat(80));
      console.log(`To: ${options.to}`);
      console.log(`From: ${fromEmail}`);
      console.log(`Subject: ${options.subject}`);
      console.log('\n--- EMAIL CONTENT (HTML) ---');
      console.log(options.html);
      if (options.text) {
        console.log('\n--- EMAIL CONTENT (TEXT) ---');
        console.log(options.text);
      }
      console.log('='.repeat(80) + '\n');
      console.log('💡 To send actual emails, configure one of:');
      console.log('   1. BREVO_API_KEY environment variable (for Brevo - recommended)');
      console.log('   2. SENDGRID_API_KEY environment variable (for SendGrid)');
      console.log('   3. SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (for SMTP)');
      console.log('='.repeat(80) + '\n');
      
      logger.warn(`[EMAIL] Email logged to console (no email service configured). To: ${options.to}`);
      return true;
      
    } catch (error) {
      logger.error(`[EMAIL] Error sending email to ${options.to}:`, error);
      return false;
    }
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
