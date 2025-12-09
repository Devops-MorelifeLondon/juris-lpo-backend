// controllers/publicRequestController.js

const PublicRequest = require("../models/PublicRequest");

const {
  publicProfileRequestTemplate,
  publicRecentWorkTemplate,
  publicInterviewBookedTemplate,
  teamRequestNotificationTemplate,
  userRequirementTemplate,
  teamRequirementTemplate
} = require("../lib/jurislpohomeTemplates");

const { sendBrevoEmailApi } = require("../lib/emailBrevoSdk");

const TEAM_EMAIL = "contact@jurislpo.com";

const validate = (arr) => arr.every((v) => v && v.trim() !== "");

// -------------------------------------------------------
// 1️⃣ PROFILE REQUEST
// -------------------------------------------------------
exports.handleProfileRequest = async (req, res) => {
  try {
    const { fullName, email, mobile } = req.body;

    if (!validate([fullName, email, mobile])) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Save to DB
    await PublicRequest.create({
      requestType: "profile",
      fullName,
      email,
      mobile
    });

    // Send to user
    await sendBrevoEmailApi({
      to_email: [{ email }],
      email_subject: "Your Profile Request – Juris LPO",
      htmlContent: publicProfileRequestTemplate(fullName),
    });

    // Notify team
    await sendBrevoEmailApi({
      to_email: [{ email: TEAM_EMAIL }],
      email_subject: "New Profile Request",
      htmlContent: teamRequestNotificationTemplate(
        "Profile Request",
        fullName,
        email,
        mobile
      ),
    });

    res.json({ success: true });

  } catch (err) {
    console.error("PROFILE REQUEST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------------------------------------
// 2️⃣ RECENT WORK REQUEST
// -------------------------------------------------------
exports.handleRecentWorkRequest = async (req, res) => {
  try {
    const { fullName, email, mobile } = req.body;

    if (!validate([fullName, email, mobile])) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // DB Save
    await PublicRequest.create({
      requestType: "recentWork",
      fullName,
      email,
      mobile
    });

    // User Email
    await sendBrevoEmailApi({
      to_email: [{ email }],
      email_subject: "Recent Work Samples – Juris LPO",
      htmlContent: publicRecentWorkTemplate(fullName),
    });

    // Team Email
    await sendBrevoEmailApi({
      to_email: [{ email: TEAM_EMAIL }],
      email_subject: "New Recent Work Request",
      htmlContent: teamRequestNotificationTemplate(
        "Recent Work Request",
        fullName,
        email,
        mobile
      ),
    });

    res.json({ success: true });

  } catch (err) {
    console.error("RECENT WORK ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------------------------------------
// 3️⃣ INTERVIEW BOOKING
// -------------------------------------------------------
exports.handleInterviewBooking = async (req, res) => {
  try {
    const { fullName, email, mobile, date, time, mode } = req.body;

    if (!validate([fullName, email, mobile, date, time])) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // SAVE TO DB
    await PublicRequest.create({
      requestType: "interview",
      fullName,
      email,
      mobile,
      interview: { date, time, mode }
    });

    // SEND TO USER
    await sendBrevoEmailApi({
      to_email: [{ email }],
      email_subject: "Your Interview is Booked – Juris LPO",
      htmlContent: publicInterviewBookedTemplate(fullName, date, time, mode),
    });

    // TEAM NOTIFICATION
    await sendBrevoEmailApi({
      to_email: [{ email: TEAM_EMAIL }],
      email_subject: "New Interview Booking",
      htmlContent: teamRequestNotificationTemplate(
        "Interview Booking",
        fullName,
        email,
        mobile,
        { date, time, mode }
      ),
    });

    res.json({ success: true });

  } catch (err) {
    console.error("INTERVIEW BOOKING ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------------------------------------
// 4️⃣ CUSTOM REQUIREMENT FORM ("Drop Your Requirement")
// -------------------------------------------------------
exports.handleCustomRequirement = async (req, res) => {
  try {
    const { service, description, name, email, number, urgency } = req.body;

    if (!validate([service, name, email, number, urgency])) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // SAVE TO DB
    await PublicRequest.create({
      requestType: "customRequirement",
      fullName: name,
      email,
      mobile: number,
      requirement: {
        service,
        description,
        urgency
      }
    });

    // USER EMAIL
    await sendBrevoEmailApi({
      to_email: [{ email }],
      email_subject: "Your Requirement Has Been Received – Juris LPO",
      htmlContent: userRequirementTemplate(name, service, urgency),
    });

    // TEAM EMAIL
    await sendBrevoEmailApi({
      to_email: [{ email: TEAM_EMAIL }],
      email_subject: "New Custom Requirement Submitted",
      htmlContent: teamRequirementTemplate({
        service,
        description,
        name,
        email,
        number,
        urgency
      }),
    });

    res.json({ success: true });

  } catch (err) {
    console.error("CUSTOM REQUIREMENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.handleConsultationRequest = async (req, res) => {
  try {
    const { fullName, email, mobile, date, time, message } = req.body;

    if (!fullName || !email || !mobile || !date || !time) {
      return res.status(400).json({ message: "Missing fields" });
    }

    await PublicRequest.create({
      requestType: "consultation",
      fullName,
      email,
      mobile,
      consultation: { date, time, message }
    });

    // USER EMAIL
    await sendBrevoEmailApi({
      to_email: [{ email }],
      email_subject: "Consultation Request Received – Juris LPO",
      htmlContent: userConsultationTemplate(fullName, date, time),
    });

    // TEAM EMAIL
    await sendBrevoEmailApi({
      to_email: [{ email: TEAM_EMAIL }],
      email_subject: "New Consultation Request",
      htmlContent: teamConsultationTemplate({
        fullName,
        email,
        mobile,
        date,
        time,
        message
      }),
    });

    res.json({ success: true });

  } catch (err) {
    console.error("CONSULTATION ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
