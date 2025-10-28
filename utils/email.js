// utils/email.js
const nodemailer = require('nodemailer');

/**
 * Send email using Nodemailer
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text version (optional)
 * @param {string} options.html - HTML version
 */
exports.sendEmail = async (options) => {
  try {
    // Create reusable transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false // For development only
      }
    });

    // Define email options
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

/**
 * Send verification email
 * @param {Object} options
 * @param {string} options.email - Recipient email
 * @param {string} options.firstName - Recipient first name
 * @param {string} options.verificationUrl - Verification URL
 */
exports.sendVerificationEmail = async ({ email, firstName, verificationUrl }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .content {
          background-color: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
        }
        h1 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
        }
        p {
          color: #4b5563;
          margin-bottom: 15px;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background-color: #1f2937;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
        .button:hover {
          background-color: #374151;
        }
        .link {
          word-break: break-all;
          color: #3b82f6;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <div class="header">
            <div class="logo">Juris-LPO</div>
          </div>
          
          <h1>Welcome to Juris-LPO, ${firstName}!</h1>
          
          <p>Thank you for registering your attorney account. We're excited to have you on board!</p>
          
          <p>Please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p class="link">${verificationUrl}</p>
          
          <div class="footer">
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
            <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} Juris-LPO. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await this.sendEmail({
    to: email,
    subject: 'Verify Your Juris-LPO Attorney Account',
    html
  });
};

/**
 * Send password reset email
 * @param {Object} options
 * @param {string} options.email - Recipient email
 * @param {string} options.firstName - Recipient first name
 * @param {string} options.resetUrl - Password reset URL
 */
exports.sendPasswordResetEmail = async ({ email, firstName, resetUrl }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .content {
          background-color: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
        }
        h1 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
        }
        p {
          color: #4b5563;
          margin-bottom: 15px;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background-color: #1f2937;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
        .button:hover {
          background-color: #374151;
        }
        .link {
          word-break: break-all;
          color: #3b82f6;
          font-size: 14px;
        }
        .warning {
          background-color: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <div class="header">
            <div class="logo">Juris-LPO</div>
          </div>
          
          <h1>Password Reset Request</h1>
          
          <p>Hi ${firstName},</p>
          
          <p>You requested a password reset for your Juris-LPO attorney account.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p class="link">${resetUrl}</p>
          
          <div class="warning">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">Security Notice</p>
            <p style="margin: 5px 0 0 0; color: #991b1b;">This link will expire in 30 minutes for security reasons.</p>
          </div>
          
          <div class="footer">
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
            <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} Juris-LPO. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await this.sendEmail({
    to: email,
    subject: 'Password Reset Request - Juris-LPO',
    html
  });
};

/**
 * Send welcome email after profile completion
 * @param {Object} options
 * @param {string} options.email - Recipient email
 * @param {string} options.firstName - Recipient first name
 * @param {string} options.firmName - Firm name
 */
exports.sendWelcomeEmail = async ({ email, firstName, firmName }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .content {
          background-color: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
        }
        h1 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
        }
        p {
          color: #4b5563;
          margin-bottom: 15px;
        }
        .feature {
          background-color: #f3f4f6;
          padding: 15px;
          margin: 10px 0;
          border-radius: 6px;
          border-left: 4px solid #1f2937;
        }
        .feature h3 {
          margin: 0 0 5px 0;
          color: #1f2937;
        }
        .feature p {
          margin: 0;
          font-size: 14px;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background-color: #1f2937;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <div class="header">
            <div class="logo">Juris-LPO</div>
          </div>
          
          <h1>Welcome to Juris-LPO!</h1>
          
          <p>Hi ${firstName},</p>
          
          <p>Congratulations! Your profile for <strong>${firmName}</strong> has been successfully set up.</p>
          
          <p>Here's what you can do now:</p>
          
          <div class="feature">
            <h3>Find Expert Paralegals</h3>
            <p>Browse our marketplace of qualified paralegals specialized in your practice areas.</p>
          </div>
          
          <div class="feature">
            <h3>Create & Manage Cases</h3>
            <p>Easily create cases, assign tasks, and track progress in real-time.</p>
          </div>
          
          <div class="feature">
            <h3>Collaborate Seamlessly</h3>
            <p>Use our built-in communication tools to stay connected with your team.</p>
          </div>
          
          <div class="feature">
            <h3>Track Time & Billing</h3>
            <p>Transparent time tracking and automated invoicing for all your cases.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/attorney/dashboard" class="button">Go to Dashboard</a>
          </div>
          
          <div class="footer">
            <p>Need help? Contact our support team at support@juris-lpo.com</p>
            <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} Juris-LPO. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await this.sendEmail({
    to: email,
    subject: 'Welcome to Juris-LPO - Your Account is Ready!',
    html
  });
};

/**
 * Send account deactivation email
 * @param {Object} options
 * @param {string} options.email - Recipient email
 * @param {string} options.firstName - Recipient first name
 */
exports.sendAccountDeactivationEmail = async ({ email, firstName }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .content {
          background-color: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
        }
        h1 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
        }
        p {
          color: #4b5563;
          margin-bottom: 15px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <div class="header">
            <div class="logo">Juris-LPO</div>
          </div>
          
          <h1>Account Deactivation Confirmation</h1>
          
          <p>Hi ${firstName},</p>
          
          <p>Your Juris-LPO attorney account has been successfully deactivated as requested.</p>
          
          <p>We're sad to see you go! If you change your mind, you can reactivate your account by contacting our support team.</p>
          
          <div class="footer">
            <p>If you didn't request this, please contact us immediately at support@juris-lpo.com</p>
            <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} Juris-LPO. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await this.sendEmail({
    to: email,
    subject: 'Account Deactivation - Juris-LPO',
    html
  });
};
