const { google } = require("googleapis");
const { oauth2Client, getAuthUrl } = require("../utils/googleAuth");
const Meeting = require("../models/Meeting");
const Attorney = require("../models/Attorney");
const Paralegal = require("../models/Paralegal");
const GoogleAuth = require("../models/GoogleAuth");
const Notification = require("../models/Notification"); // ✅ Ensure this is imported
const { default: mongoose } = require("mongoose");

// STEP 1: Get Google Auth URL
exports.getGoogleAuthUrl = (req, res) => {
  try {
    let token = null;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    if (!token) return res.status(401).json({ error: "Missing JWT token" });

    // ✅ Uses the robust utility function (Fixes Error 400 & invalid_grant)
    const url = getAuthUrl(token); 
    
    console.log("🔗 Correct Google Auth URL:", url);
    res.json({ url });
  } catch (err) {
    console.error("Google URL error:", err);
    res.status(500).json({ error: "Failed to generate Google URL" });
  }
};

// STEP 2: Google Callback
exports.googleCallback = async (req, res) => {
  try {
    const code = req.query.code;
    const token = req.query.state;

    if (!code || !token)
      return res.status(400).json({ error: "Invalid Google callback request" });

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userModel =
      decoded.role === "attorney"
        ? require("../models/Attorney")
        : require("../models/Paralegal");

    const user = await userModel.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { tokens } = await oauth2Client.getToken(code);
    console.log("🔐 Tokens from Google:", tokens);

    const updateData = {
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date,
    };

    if (tokens.refresh_token) {
      updateData.refreshToken = tokens.refresh_token;
    }

    const userType = decoded.role === "attorney" ? "Attorney" : "Paralegal";

    await GoogleAuth.findOneAndUpdate(
      { user: user._id, userType },
      updateData,
      { upsert: true, new: true }
    );

    console.log("✅ Google tokens saved safely for:", user.email);

    const redirectURL =
      decoded.role === "attorney"
        ? `${process.env.ATTORNEY_FRONTEND_URL}/meetings`
        : `${process.env.PARALEGAL_FRONTEND_URL}/meetings`;

    return res.redirect(redirectURL);
  } catch (error) {
    console.error("❌ OAuth error:", error);
    res.status(500).json({
      error: "OAuth failed",
      details: error.message,
    });
  }
};

// STEP 3: Schedule Meeting + Send Notification
exports.scheduleMeeting = async (req, res) => {
  try {
    const { title, description, startTime, endTime, participantId, participantEmail } = req.body;

    const user = req.user;
    const creatorType = user.role === "attorney" ? "Attorney" : "Paralegal";

    const googleAuth = await GoogleAuth.findOne({
      user: user._id,
      userType: creatorType,
    });

    if (!googleAuth) {
      return res.status(401).json({
        error: "Please connect your Google account first.",
      });
    }

    if (!googleAuth.refreshToken) {
      return res.status(401).json({
        error: "Google session expired. Please reconnect Google Calendar.",
      });
    }

    oauth2Client.setCredentials({
      access_token: googleAuth.accessToken,
      refresh_token: googleAuth.refreshToken,
    });

    // 🔄 Auto refresh logic
    oauth2Client.on("tokens", async (tokens) => {
      const updateData = {};
      if (tokens.access_token) updateData.accessToken = tokens.access_token;
      if (tokens.expiry_date) updateData.expiryDate = tokens.expiry_date;
      if (tokens.refresh_token) updateData.refreshToken = tokens.refresh_token;

      await GoogleAuth.findOneAndUpdate(
        { user: user._id, userType: creatorType },
        updateData
      );
      console.log("🔄 Tokens updated automatically");
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: title,
      description,
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: "Asia/Kolkata",
      },
      attendees: [{ email: participantEmail }],
      conferenceData: {
        createRequest: { requestId: Math.random().toString(36).substring(2) },
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.hangoutLink;
    const googleEventId = response.data.id;

    // Determine Participant Model
    const participantModel =
      creatorType === "Attorney" ? Paralegal : Attorney;
    const participantType = creatorType === "Attorney" ? "Paralegal" : "Attorney";

    const participant = await participantModel.findById(participantId);

    // 1. Create Meeting
    const meeting = new Meeting({
      title,
      description,
      startTime,
      endTime,
      meetLink,
      googleEventId,
      createdBy: user._id,
      creatorType,
      participants: [participantId],
      participantType,
      creatorEmail: user.email,
      participantEmail: participant?.email,
      creatorName: user.fullName || `${user.firstName} ${user.lastName}`,
      participantName: participant?.fullName || `${participant.firstName} ${participant.lastName}`,
    });

    await meeting.save();

    // 🔔 2. CREATE NOTIFICATION (Added)
    try {
      await Notification.create({
        recipient: participantId,
        recipientModel: participantType, // e.g., "Paralegal"
        type: 'meeting_scheduled',
        meeting: meeting._id, // Link to the meeting we just created
        title: "📅 New Meeting Scheduled",
        message: `${meeting.creatorName} scheduled a meeting with you: "${title}"`,
        details: {
          userName: meeting.creatorName,
          action: "scheduled"
        }
      });
      console.log("🔔 Notification sent to participant");
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
      // We do not throw here, because the meeting was already successful
    }

    res.json({ success: true, meetLink });
  } catch (error) {
    console.error("❌ Schedule meeting error:", error.response?.data || error);

    if (error?.response?.data?.error === "invalid_grant") {
      return res.status(401).json({
        error: "Google session expired. Please reconnect your Google account.",
      });
    }

    res.status(500).json({
      error: "Failed to schedule meeting",
      details: error.message,
    });
  }
};

// STEP 4: Get All Meetings
exports.getAllMeetings = async (req, res) => {
  try {
    const now = new Date();
    const user = req.user;
    console.log("👤 Authenticated user:", user);

    const role = user.role === "attorney" ? "Attorney" : "Paralegal";

    const baseFilter = {
      $or: [
        { createdBy: new mongoose.Types.ObjectId(user._id), creatorType: role },
        { participants: new mongoose.Types.ObjectId(user._id) },
      ],
    };

    const allMeetings = await Meeting.find(baseFilter)
      .sort({ startTime: 1 })
      .populate("createdBy", "fullName firstName lastName email")
      .populate("participants", "fullName firstName lastName email");

    const upcoming = allMeetings.filter((m) => new Date(m.startTime) > now);
    const ongoing = allMeetings.filter(
      (m) => new Date(m.startTime) <= now && new Date(m.endTime) >= now
    );
    const past = allMeetings.filter((m) => new Date(m.endTime) < now);

    res.json({ success: true, upcoming, ongoing, past });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Error fetching meetings" });
  }
};

exports.getGoogleStatus = async (req, res) => {
  const user = req.user;
  const userType = user.role === "attorney" ? "Attorney" : "Paralegal";
  const record = await GoogleAuth.findOne({ user: user._id, userType });
  res.json({ connected: !!record });
};