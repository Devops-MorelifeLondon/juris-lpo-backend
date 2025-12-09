// utils/publicEmailTemplates.js

// --- Branding ---
const brandName = 'Juris-LPO';
const brandColor = '#1f2937';
const backgroundColor = '#f9fafb';
const contentBackgroundColor = '#ffffff';
const textColor = '#374151';
const lightTextColor = '#6b7280';
const footerColor = '#9ca3af';
const fontStack = `'-apple-system','BlinkMacSystemFont','Segoe UI','Roboto','Helvetica','Arial','sans-serif'`;

// --- Shared Layout ---
const mainBodyStyle = `
  font-family:${fontStack};
  background-color:${backgroundColor};
  margin:0;
  padding:0;
`;

const containerStyle = `
  max-width:600px;
  margin:40px auto;
  padding:40px;
  background-color:${contentBackgroundColor};
  border-radius:8px;
  box-shadow:0 4px 6px rgba(0,0,0,0.1);
`;

const header = `
  <div style="text-align:center; padding-bottom:24px; border-bottom:2px solid #e5e7eb;">
    <h1 style="font-size:28px; font-weight:700; color:${brandColor}; margin:0;">${brandName}</h1>
    <p style="font-size:14px; color:${lightTextColor}; margin:4px 0 0;">Legal Process Outsourcing</p>
  </div>
`;

const footer = `
  <div style="text-align:center; margin-top:32px; padding-top:20px; border-top:1px solid #e5e7eb;">
    <p style="color:${footerColor}; font-size:12px; margin:0;">&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
    <p style="color:${footerColor}; font-size:12px; margin:8px 0 0;">Email us: support@juris-lpo.com</p>
  </div>
`;

// -------------------------------------------------------
// PUBLIC TEMPLATES
// -------------------------------------------------------

const publicProfileRequestTemplate = (fullName) => `
  <!DOCTYPE html>
  <html>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size:24px; font-weight:600; color:${textColor}; margin-bottom:16px;">
        Your Profile Request is Received
      </h2>
      <p style="color:${lightTextColor}; font-size:15px;">Hi ${fullName}, we received your profile request.</p>
      <p style="color:${lightTextColor}; font-size:15px;">Our team will send curated profiles shortly.</p>
      ${footer}
    </div>
  </body>
  </html>
`;

const publicRecentWorkTemplate = (fullName) => `
  <!DOCTYPE html>
  <html>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size:24px; font-weight:600; color:${textColor}; margin-bottom:16px;">
        Recent Work Request Received
      </h2>
      <p style="color:${lightTextColor}; font-size:15px;">Hi ${fullName}, we received your request for sample work.</p>
      <p style="color:${lightTextColor}; font-size:15px;">Our team is preparing work samples for you.</p>
      ${footer}
    </div>
  </body>
  </html>
`;

const publicInterviewBookedTemplate = (fullName, date, time, mode) => `
  <!DOCTYPE html>
  <html>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size:24px; font-weight:600; color:${textColor}; margin-bottom:16px;">
        Interview Booked Successfully
      </h2>
      <p style="color:${lightTextColor}; font-size:15px;">Hi ${fullName}, your interview has been scheduled.</p>
      <p style="color:${lightTextColor}; font-size:15px;">
        <strong>Date:</strong> ${date}<br/>
        <strong>Time:</strong> ${time}<br/>
        <strong>Mode:</strong> ${mode || 'Online Meeting'}
      </p>
      ${footer}
    </div>
  </body>
  </html>
`;

const teamRequestNotificationTemplate = (type, fullName, email, mobile, extra = {}) => `
  <!DOCTYPE html>
  <html>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}
      <h2 style="font-size:22px; font-weight:600; color:${textColor}; margin-bottom:16px;">
        New ${type} Request
      </h2>
      <p style="color:${lightTextColor}; font-size:15px;">
        A new request has been submitted.
      </p>
      <p style="font-size:15px; color:${textColor}; line-height:1.7;">
        <strong>Name:</strong> ${fullName}<br/>
        <strong>Email:</strong> ${email}<br/>
        <strong>Mobile:</strong> ${mobile}<br/>
        <strong>Type:</strong> ${type}<br/>
        ${extra.date ? `<strong>Date:</strong> ${extra.date}<br/>` : ""}
        ${extra.time ? `<strong>Time:</strong> ${extra.time}<br/>` : ""}
      </p>
      ${footer}
    </div>
  </body>
  </html>
`;

const userRequirementTemplate = (fullName, service, urgency) => `
  <!DOCTYPE html>
  <html>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}

      <h2 style="font-size:24px; font-weight:600; color:${textColor}; margin-bottom:16px;">
        Your Requirement Has Been Received
      </h2>

      <p style="color:${lightTextColor}; font-size:15px;">
        Hi ${fullName}, thank you for submitting your requirement.  
        Our experts will review it and get back to you shortly.
      </p>

      <div style="margin:20px 0; padding:16px; background:#eff6ff; border-left:4px solid ${brandColor}; border-radius:6px;">
        <p style="margin:0; font-size:15px; color:${textColor};">
          <strong>Requested Service:</strong> ${service}<br/>
          <strong>Urgency:</strong> ${urgency}
        </p>
      </div>

      <p style="color:${lightTextColor}; font-size:15px;">
        We appreciate your interest in Juris-LPO. 
        Our team will reach out to you soon with details.
      </p>

      ${footer}
    </div>
  </body>
  </html>
`;

const teamRequirementTemplate = (data) => `
  <!DOCTYPE html>
  <html>
  <body style="${mainBodyStyle}">
    <div style="${containerStyle}">
      ${header}

      <h2 style="font-size:22px; font-weight:600; color:${textColor}; margin-bottom:16px;">
        New Requirement Submitted
      </h2>

      <p style="color:${lightTextColor}; font-size:15px;">
        A new custom requirement has been submitted from the public website.
      </p>

      <p style="line-height:1.7; color:${textColor}; font-size:15px;">
        <strong>Name:</strong> ${data.name}<br/>
        <strong>Email:</strong> ${data.email}<br/>
        <strong>Mobile:</strong> ${data.number}<br/><br/>

        <strong>Service:</strong> ${data.service}<br/>
        <strong>Urgency:</strong> ${data.urgency}<br/><br/>

        <strong>Description:</strong><br/>
        ${data.description || "No description provided"}
      </p>

      ${footer}
    </div>
  </body>
  </html>
`;

const userConsultationTemplate = (fullName, date, time) => `
  <html>
    <body>
      <h2>Consultation Scheduled</h2>
      <p>Hi ${fullName}, your consultation request has been received.</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p>Our team will contact you shortly.</p>
    </body>
  </html>
`;

const teamConsultationTemplate = ({ fullName, email, mobile, date, time, message }) => `
  <html>
    <body>
      <h2>New Consultation Request</h2>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Mobile:</strong> ${mobile}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Message:</strong> ${message || "Not Provided"}</p>
    </body>
  </html>
`;


module.exports = {
  publicProfileRequestTemplate,
  publicRecentWorkTemplate,
  publicInterviewBookedTemplate,
  teamRequestNotificationTemplate,
  userRequirementTemplate,
  teamRequirementTemplate,
  userConsultationTemplate,
  teamConsultationTemplate
};

