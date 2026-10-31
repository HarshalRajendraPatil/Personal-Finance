import nodemailer from 'nodemailer';

/**
 * Creates and returns a Nodemailer transporter based on .env config.
 */
const createTransporter = () => {
  const { EMAIL_SERVICE, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    return null;
  }

  if (EMAIL_SERVICE && EMAIL_SERVICE.toLowerCase() === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS.replace(/\s+/g, ''), // Strip any spaces from app password
      },
    });
  }

  if (EMAIL_HOST) {
    return nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT) || 587,
      secure: Number(EMAIL_PORT) === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  // Default fallback to service: gmail if host is not specified
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS.replace(/\s+/g, ''),
    },
  });
};

/**
 * Core generic send email function with terminal simulation fallback.
 */
export const sendEmail = async ({ to, subject, html, text, actionLink = '' }) => {
  const transporter = createTransporter();
  const fromAddress = process.env.EMAIL_FROM || `"Capise Finance" <${process.env.EMAIL_USER || 'noreply@capise.app'}>`;

  if (!transporter) {
    console.log('\n===============================================================================');
    console.log('⚡ [EMAIL SIMULATION] Real email credentials not yet provided in Server/.env');
    console.log(`📧 To:      ${to}`);
    console.log(`📌 Subject: ${subject}`);
    if (actionLink) {
      console.log(`🔗 Action Link: \x1b[36m\x1b[4m${actionLink}\x1b[0m`);
    }
    console.log('💡 Tip: Set EMAIL_USER and EMAIL_PASS in Server/.env to send real emails via Gmail or SMTP.');
    console.log('===============================================================================\n');
    return { success: true, simulated: true, actionLink };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: text || '',
      html,
    });
    console.log(`[EMAIL SENT] To: ${to} | ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL SEND ERROR]', error);
    // Even if sending fails (e.g. invalid SMTP), don't completely crash the caller
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Password Reset Email Template & Sender
 */
export const sendPasswordResetEmail = async ({ email, name, resetUrl }) => {
  const subject = 'Reset Your Capise Account Password';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
          .container { max-width: 540px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 32px 28px; }
          .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
          .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }
          .btn:hover { background-color: #1d4ed8; }
          .footer { background: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          .alt-link { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 20px; line-height: 1.5; }
          .warning { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; font-size: 13px; color: #b45309; border-radius: 4px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Capise Personal Finance</h1>
          </div>
          <div class="content">
            <div class="greeting">Hello ${name ? name : 'there'},</div>
            <p class="message">
              We received a request to reset the password for your Capise account associated with <strong>${email}</strong>.
            </p>
            <div class="btn-container">
              <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
            </div>
            <p class="message" style="margin-bottom: 0;">
              This password reset link will expire in <strong>1 hour</strong>.
            </p>
            <div class="warning">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </div>
            <div class="alt-link">
              Having trouble with the button? Copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Capise Personal Finance. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    text: `Hello ${name || ''},\n\nReset your Capise password here (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
    actionLink: resetUrl,
  });
};

/**
 * Email Verification Template & Sender
 */
export const sendVerificationEmail = async ({ email, name, verifyUrl }) => {
  const subject = 'Verify Your Email Address - Capise';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
          .container { max-width: 540px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 32px 28px; }
          .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
          .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }
          .btn:hover { background-color: #1d4ed8; }
          .footer { background: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          .alt-link { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 20px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Capise!</h1>
          </div>
          <div class="content">
            <div class="greeting">Hello ${name ? name : 'there'},</div>
            <p class="message">
              Thank you for signing up for Capise Personal Finance. Please verify your email address to confirm ownership and activate full account capabilities.
            </p>
            <div class="btn-container">
              <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
            </div>
            <p class="message" style="margin-bottom: 0;">
              This verification link will expire in <strong>24 hours</strong>.
            </p>
            <div class="alt-link">
              Having trouble with the button? Copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #2563eb;">${verifyUrl}</a>
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Capise Personal Finance. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    text: `Hello ${name || ''},\n\nWelcome to Capise! Please verify your email address here (valid for 24 hours):\n${verifyUrl}`,
    actionLink: verifyUrl,
  });
};
