// utils/emailTemplates.js

// --- Shared Styles & Structure ---
const brandName = 'Juris-LPO';
const brandColor = '#1f2937'; // Professional dark gray
const fontStack = `'-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'`;
const backgroundColor = '#f9fafb';
const contentBackgroundColor = '#ffffff';
const textColor = '#374151'; // Dark gray
const lightTextColor = '#6b7280'; // Lighter gray
const footerColor = '#9ca3af';

const header = `
  <div style="text-align: center; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb;">
    <h1 style="font-size: 28px; font-weight: 700; color: ${brandColor}; margin: 0;">${brandName}</h1>
    <p style="font-size: 14px; color: ${lightTextColor}; margin: 4px 0 0;">Legal Process Outsourcing</p>
  </div>
  
`;

const footer = `
  <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="color: ${footerColor}; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
    <p style="color: ${footerColor}; font-size: 12px; margin: 8px 0 0;">Need help? Contact us at support@juris-lpo.com</p>
  </div>
`;

const mainBodyStyle = `font-family: ${fontStack}; background-color: ${backgroundColor}; margin: 0; padding: 0;`;
const containerStyle = `max-width: 600px; margin: 40px auto; padding: 40px; background-color: ${contentBackgroundColor}; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);`;

// --- Email Templates ---

// 1. Email Verification (Attorney)
exports.attorneyVerificationTemplate = (firstName, verificationUrl) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Verify Your Attorney Account</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">Welcome to Juris-LPO, ${firstName}!</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Thank you for registering your attorney account. We're excited to help you streamline your legal practice with our dedicated paralegal services.</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Please verify your email address to get started:</p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${verificationUrl}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Verify Email Address</a>
      </div>
      <p style="color: ${footerColor}; font-size: 13px; line-height: 1.6; text-align: center;">Or copy and paste this link into your browser:</p>
      <p style="color: #3b82f6; font-size: 13px; word-break: break-all; text-align: center;">${verificationUrl}</p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #991b1b; font-size: 13px; margin: 0; line-height: 1.6;">This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.</p>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 2. Email Verification (Paralegal)
exports.paralegalVerificationTemplate = (firstName, verificationUrl) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Verify Your Paralegal Account</title>
  </head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">
        Welcome to Juris-LPO, ${firstName}!
      </h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">
        Thank you for joining the Juris-LPO network as a Paralegal. We're thrilled to have you onboard to support attorneys and legal professionals with top-tier paralegal assistance.
      </p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">
        Please verify your email address to activate your account and start connecting with attorneys:
      </p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${verificationUrl}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="color: ${footerColor}; font-size: 13px; line-height: 1.6; text-align: center;">
        Or copy and paste this link into your browser:
      </p>
      <p style="color: #3b82f6; font-size: 13px; word-break: break-all; text-align: center;">
        ${verificationUrl}
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #991b1b; font-size: 13px; margin: 0; line-height: 1.6;">
          This verification link will expire in 24 hours. If you didn’t create this account, please ignore this email.
        </p>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};


// 3. Password Reset (Attorney)
exports.attorneyPasswordResetTemplate = (firstName, resetUrl) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Reset Your Password</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">Password Reset Request</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">We received a request to reset the password for your attorney account. Click the button below to create a new password:</p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: ${footerColor}; font-size: 13px; line-height: 1.6; text-align: center;">Or copy and paste this link into your browser:</p>
      <p style="color: #3b82f6; font-size: 13px; word-break: break-all; text-align: center;">${resetUrl}</p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #991b1b; font-size: 13px; margin: 0; line-height: 1.6; font-weight: 600;">Security Notice</p>
        <p style="color: #991b1b; font-size: 13px; margin: 8px 0 0; line-height: 1.6;">This link will expire in 30 minutes. If you didn't request this password reset, please ignore this email or contact support immediately.</p>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 4. Password Reset (Paralegal)
exports.paralegalPasswordResetTemplate = (firstName, resetUrl) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Reset Your Password</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">Password Reset Request</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">We received a request to reset the password for your paralegal account. Click the button below to create a new password:</p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: ${footerColor}; font-size: 13px; line-height: 1.6; text-align: center;">Or copy and paste this link into your browser:</p>
      <p style="color: #3b82f6; font-size: 13px; word-break: break-all; text-align: center;">${resetUrl}</p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #991b1b; font-size: 13px; margin: 0; line-height: 1.6; font-weight: 600;">Security Notice</p>
        <p style="color: #991b1b; font-size: 13px; margin: 8px 0 0; line-height: 1.6;">This link will expire in 30 minutes.</p>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 5. Profile Completion Welcome (Attorney)
exports.attorneyWelcomeTemplate = (firstName, firmName, dashboardLink) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Welcome to Juris-LPO!</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">Welcome to Juris-LPO!</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Congratulations! Your attorney profile for <strong>${firmName}</strong> has been successfully completed and verified.</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">You now have full access to our platform. Here's what you can do:</p>
      <div style="background-color: #f3f4f6; padding: 20px; margin: 24px 0; border-radius: 8px; border-left: 4px solid ${brandColor};">
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 600; color: ${textColor}; margin: 0 0 4px;">🔍 Browse Qualified Paralegals</h3>
          <p style="font-size: 14px; color: ${lightTextColor}; margin: 0; line-height: 1.5;">Find expert paralegals specialized in your practice areas</p>
        </div>
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 600; color: ${textColor}; margin: 0 0 4px;">📋 Create & Manage Cases</h3>
          <p style="font-size: 14px; color: ${lightTextColor}; margin: 0; line-height: 1.5;">Assign work, track progress, and manage documents</p>
        </div>
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 600; color: ${textColor}; margin: 0 0 4px;">💬 Seamless Communication</h3>
          <p style="font-size: 14px; color: ${lightTextColor}; margin: 0; line-height: 1.5;">Built-in messaging and real-time collaboration tools</p>
        </div>
        <div>
          <h3 style="font-size: 16px; font-weight: 600; color: ${textColor}; margin: 0 0 4px;">💰 Transparent Billing</h3>
          <p style="font-size: 14px; color: ${lightTextColor}; margin: 0; line-height: 1.5;">Track time, review work logs, and manage invoices</p>
        </div>
      </div>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${dashboardLink}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Go to Dashboard</a>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 6. Profile Completion Welcome (Paralegal)
exports.paralegalWelcomeTemplate = (firstName, dashboardLink) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Welcome to Juris-LPO!</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">Welcome to Juris-LPO!</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Congratulations! Your paralegal profile is now complete and live on our platform. Attorneys can now discover and assign cases to you.</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Here's how to get started:</p>
      <div style="background-color: #f3f4f6; padding: 20px; margin: 24px 0; border-radius: 8px; border-left: 4px solid ${brandColor};">
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 600; color: ${textColor}; margin: 0 0 4px;">📨 Accept Case Assignments</h3>
          <p style="font-size: 14px; color: ${lightTextColor}; margin: 0; line-height: 1.5;">Review and accept cases from attorneys</p>
        </div>
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 600; color: ${textColor}; margin: 0 0 4px;">⏱️ Log Your Work</h3>
          <p style="font-size: 14px; color: ${lightTextColor}; margin: 0; line-height: 1.5;">Track time spent on tasks with detailed work logs</p>
        </div>
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 600; color: ${textColor}; margin: 0 0 4px;">📄 Upload Documents</h3>
          <p style="font-size: 14px; color: ${lightTextColor}; margin: 0; line-height: 1.5;">Submit drafts and completed work for attorney review</p>
        </div>
        <div>
          <h3 style="font-size: 16px; font-weight: 600; color: ${textColor}; margin: 0 0 4px;">💵 Get Paid</h3>
          <p style="font-size: 14px; color: ${lightTextColor}; margin: 0; line-height: 1.5;">Receive payments for approved work hours</p>
        </div>
      </div>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${dashboardLink}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Go to Dashboard</a>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 7. Case Assignment Notification (Paralegal)
exports.caseAssignmentTemplate = (firstName, caseNumber, caseName, attorneyName, deadline, caseLink) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>New Case Assignment</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">New Case Assignment</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">You have received a new case assignment from <strong>${attorneyName}</strong>. Please review the details and accept or decline the case.</p>
      <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0; color: ${lightTextColor}; font-size: 14px;">Case Number</td>
          <td style="padding: 12px 0; color: ${textColor}; font-weight: 600; text-align: right; font-size: 14px;">${caseNumber}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0; color: ${lightTextColor}; font-size: 14px;">Case Name</td>
          <td style="padding: 12px 0; color: ${textColor}; text-align: right; font-size: 14px;">${caseName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0; color: ${lightTextColor}; font-size: 14px;">Attorney</td>
          <td style="padding: 12px 0; color: ${textColor}; text-align: right; font-size: 14px;">${attorneyName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: ${lightTextColor}; font-size: 14px;">Deadline</td>
          <td style="padding: 12px 0; color: ${textColor}; font-weight: 600; text-align: right; font-size: 14px;">${deadline}</td>
        </tr>
      </table>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${caseLink}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Review Case Details</a>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 8. Case Accepted Notification (Attorney)
exports.caseAcceptedTemplate = (firstName, caseNumber, paralegalName, caseLink) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Case Accepted</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">Case Accepted!</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Good news! <strong>${paralegalName}</strong> has accepted your case <strong>${caseNumber}</strong> and will begin working on it shortly.</p>
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #166534; font-size: 14px; margin: 0; line-height: 1.6;">You can now create tasks, communicate with your paralegal, and track progress through your dashboard.</p>
      </div>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${caseLink}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">View Case Details</a>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 9. Case Declined Notification (Attorney)
exports.caseDeclinedTemplate = (firstName, caseNumber, paralegalName, reason) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Case Declined</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">Case Assignment Declined</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;"><strong>${paralegalName}</strong> has declined the case <strong>${caseNumber}</strong>.</p>
      ${reason ? `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #991b1b; font-size: 14px; margin: 0; line-height: 1.6;"><strong>Reason:</strong> ${reason}</p>
      </div>
      ` : ''}
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">You can assign this case to another paralegal from your dashboard.</p>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 10. Document Uploaded Notification (Attorney)
exports.documentUploadedTemplate = (firstName, documentTitle, paralegalName, caseNumber, documentLink) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>New Document Uploaded</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">New Document Ready for Review</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;"><strong>${paralegalName}</strong> has uploaded a new document for case <strong>${caseNumber}</strong>:</p>
      <div style="background-color: #f3f4f6; padding: 16px; margin: 24px 0; border-radius: 8px; border-left: 4px solid ${brandColor};">
        <p style="color: ${textColor}; font-size: 16px; font-weight: 600; margin: 0;">📄 ${documentTitle}</p>
      </div>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Please review the document and provide your feedback.</p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${documentLink}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Review Document</a>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 11. Work Log Submitted Notification (Attorney)
exports.workLogSubmittedTemplate = (firstName, paralegalName, caseNumber, hours, amount, workLogLink) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Work Log Submitted for Approval</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">Work Log Awaiting Approval</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;"><strong>${paralegalName}</strong> has submitted a work log for case <strong>${caseNumber}</strong> that requires your approval.</p>
      <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0; color: ${lightTextColor}; font-size: 14px;">Hours Logged</td>
          <td style="padding: 12px 0; color: ${textColor}; font-weight: 600; text-align: right; font-size: 14px;">${hours} hours</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: ${lightTextColor}; font-size: 14px;">Amount</td>
          <td style="padding: 12px 0; color: ${textColor}; font-weight: 600; text-align: right; font-size: 16px;">${amount}</td>
        </tr>
      </table>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${workLogLink}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Review Work Log</a>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 12. Work Log Approved Notification (Paralegal)
exports.workLogApprovedTemplate = (firstName, caseNumber, hours, amount) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Work Log Approved</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">Work Log Approved!</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Great news! Your work log for case <strong>${caseNumber}</strong> has been approved.</p>
      <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0; color: ${lightTextColor}; font-size: 14px;">Approved Hours</td>
          <td style="padding: 12px 0; color: ${textColor}; font-weight: 600; text-align: right; font-size: 14px;">${hours} hours</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: ${lightTextColor}; font-size: 14px;">Amount</td>
          <td style="padding: 12px 0; color: #22c55e; font-weight: 600; text-align: right; font-size: 16px;">${amount}</td>
        </tr>
      </table>
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #166534; font-size: 14px; margin: 0; line-height: 1.6;">This amount will be included in your next invoice.</p>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 13. Invoice Generated Notification (Both)
exports.invoiceGeneratedTemplate = (firstName, invoiceNumber, totalAmount, dueDate, invoiceLink) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Invoice Generated</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">Invoice Generated</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">A new invoice has been generated for your recent work.</p>
      <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0; color: ${lightTextColor}; font-size: 14px;">Invoice Number</td>
          <td style="padding: 12px 0; color: ${textColor}; font-weight: 600; text-align: right; font-size: 14px;">${invoiceNumber}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0; color: ${lightTextColor}; font-size: 14px;">Total Amount</td>
          <td style="padding: 12px 0; color: ${textColor}; font-weight: 600; text-align: right; font-size: 16px;">${totalAmount}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: ${lightTextColor}; font-size: 14px;">Due Date</td>
          <td style="padding: 12px 0; color: ${textColor}; text-align: right; font-size: 14px;">${dueDate}</td>
        </tr>
      </table>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${invoiceLink}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">View Invoice</a>
      </div>
      ${footer}
    </div>
  </body>
  </html>`;
};

// 14. Case Completed Notification (Both)
exports.caseCompletedTemplate = (firstName, caseNumber, caseName, completionDate) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Case Completed</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">Case Successfully Completed! 🎉</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Hi ${firstName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">The case <strong>${caseNumber} - ${caseName}</strong> has been marked as completed.</p>
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 24px 0; border-radius: 8px; text-align: center;">
        <p style="color: #166534; font-size: 16px; font-weight: 600; margin: 0 0 8px;">✓ Case Completed</p>
        <p style="color: #166534; font-size: 14px; margin: 0;">Completion Date: ${completionDate}</p>
      </div>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Thank you for your excellent work on this case!</p>
      ${footer}
    </div>
  </body>
  </html>`;
};





// Helper function for priority colors
function getPriorityColor(priority) {
  const colors = {
    'Low': '#10b981',
    'Medium': '#f59e0b',
    'High': '#f97316',
    'Critical': '#ef4444'
  };
  return colors[priority] || '#6b7280';
}

// Attorney task creation confirmation template
exports.attorneyTaskCreatedTemplate = (attorneyName, taskDetails) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Task Created Successfully</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">✅ Task Created Successfully</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Dear ${attorneyName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Your task has been created and broadcasted to all available paralegals. Paralegals can now accept this task on a first-come-first-served basis.</p>
      
      <div style="background-color: #eff6ff; border-left: 4px solid ${brandColor}; padding: 20px; margin: 24px 0; border-radius: 4px;">
        <h3 style="color: ${textColor}; font-size: 16px; margin: 0 0 12px; font-weight: 600;">Task Details:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600; width: 140px;">Title:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px;">${taskDetails.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600;">Type:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px;">${taskDetails.type}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600;">Priority:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px;"><span style="background-color: ${getPriorityColor(taskDetails.priority)}; color: #ffffff; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">${taskDetails.priority}</span></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600;">Due Date:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px;">${new Date(taskDetails.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
          ${taskDetails.estimatedHours ? `
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600;">Est. Hours:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px;">${taskDetails.estimatedHours} hours</td>
          </tr>` : ''}
        </table>
      </div>

      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">You will receive a notification once a paralegal accepts this task.</p>
      
   
      ${footer}
    </div>
  </body>
  </html>`;
};

// Paralegal new task available template
exports.paralegalTaskAvailableTemplate = (paralegalName, taskDetails) => {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>New Task Available</title></head>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size: 24px; font-weight: 600; color: ${textColor}; margin: 32px 0 16px;">🔔 New Task Available</h2>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">Dear ${paralegalName},</p>
      <p style="color: ${lightTextColor}; line-height: 1.6; font-size: 15px;">A new task is available for acceptance. Review the details below and accept it quickly - tasks are assigned on a first-come-first-served basis!</p>
      
      <div style="background-color: #eff6ff; border-left: 4px solid ${brandColor}; padding: 20px; margin: 24px 0; border-radius: 4px;">
        <h3 style="color: ${textColor}; font-size: 16px; margin: 0 0 12px; font-weight: 600;">Task Details:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600; width: 140px;">Title:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px; font-weight: 600;">${taskDetails.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600;">Description:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px;">${taskDetails.description.length > 150 ? taskDetails.description.substring(0, 150) + '...' : taskDetails.description}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600;">Type:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px;">${taskDetails.type}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600;">Priority:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px;"><span style="background-color: ${getPriorityColor(taskDetails.priority)}; color: #ffffff; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">${taskDetails.priority}</span></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600;">Due Date:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px; font-weight: 600; color: #dc2626;">${new Date(taskDetails.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
          ${taskDetails.estimatedHours ? `
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600;">Est. Hours:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px;">${taskDetails.estimatedHours} hours</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 8px 0; color: ${lightTextColor}; font-size: 14px; font-weight: 600;">Assigned By:</td>
            <td style="padding: 8px 0; color: ${textColor}; font-size: 14px;">${taskDetails.assignedByName}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.6;"><strong>⚡ First Come First Served:</strong> This task will be assigned to the first paralegal who accepts it. Act quickly to secure this opportunity!</p>
      </div>

   
      ${footer}
    </div>
  </body>
  </html>`;
};
