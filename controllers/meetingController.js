const { google } = require("googleapis");
const { oauth2Client, getAuthUrl } = require("../utils/googleAuth");
const Meeting = require("../models/Meeting");
const Attorney = require("../models/Attorney");
const Paralegal = require("../models/Paralegal");
const GoogleAuth = require("../models/GoogleAuth");
const { default: mongoose } = require("mongoose");
const Notification = require("../models/Notification");

// STEP 1: Get Google Auth URL (only works for logged-in user)
exports.getGoogleAuthUrl = (req, res) => {
  try {
    let token = null;

    // ✅ 1. Get token from header or cookie
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    if (!token) return res.status(401).json({ error: "Missing JWT token" });

    const url = `${getAuthUrl()}&state=${encodeURIComponent(token)}`;
    console.log("🔗 Google Auth URL with token:", url);
    res.json({ url });
  } catch (err) {
    console.error("Google URL error:", err);
    res.status(500).json({ error: "Failed to generate Google URL" });
  }
};


// STEP 2: Google Callback (store token per logged-in user)
exports.googleCallback = async (req, res) => {
  try {
    const code = req.query.code;
    const token = req.query.state; // JWT token we passed earlier

    if (!code || !token) {
      console.error("❌ Missing code or state:", req.query);
      return res.status(400).json({ error: "Invalid Google callback request" });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load correct user
    const userModel =
      decoded.role === "attorney" ? require("../models/Attorney") : require("../models/Paralegal");

    const user = await userModel.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    console.log("✅ User identified for OAuth:", user.email);

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const userType = decoded.role === "attorney" ? "Attorney" : "Paralegal";

    await GoogleAuth.findOneAndUpdate(
      { user: user._id, userType },
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      },
      { upsert: true, new: true }
    );

    console.log("✅ Google tokens saved for user:", user.email);
    if(decoded.role == 'attorney'){
      return res.redirect(`${process.env.ATTORNEY_FRONTEND_URL}/meetings`);
    }else{
       return res.redirect(`${process.env.PARALEGAL_FRONTEND_URL}/meetings`);
    }
  } catch (error) {
    console.error("❌ OAuth error:", error.message);
    res.status(500).json({ error: "OAuth failed", details: error.message });
  }
};


// STEP 3: Schedule Meeting (Authenticated + Google Linked)
exports.scheduleMeeting = async (req, res) => {
  try {
    const { title, description, startTime, endTime, participantId, participantEmail } = req.body;

    console.log(req.body);
    const user = req.user;
    const creatorType = user.role === "attorney" ? "Attorney" : "Paralegal";

    const googleAuth = await GoogleAuth.findOne({
      user: user._id,
      userType: creatorType,
    });

    if (!googleAuth) {
      return res.status(401).json({
        error: "Please connect your Google account first to schedule meetings.",
      });
    }

    // Set OAuth credentials
    oauth2Client.setCredentials({
      access_token: googleAuth.accessToken,
      refresh_token: googleAuth.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: title,
      description,
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: "Asia/Kolkata", // ✅ must specify
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

    const participantModel = creatorType === "Attorney" ? Paralegal : Attorney;
    const participant = await participantModel.findById(participantId);

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
      participantType: creatorType === "Attorney" ? "Paralegal" : "Attorney",
      creatorEmail: user.email,
      participantEmail: participant?.email,
      creatorName:
        creatorType === "Attorney" ? user.fullName : `${user.firstName} ${user.lastName}`,
      participantName:
        creatorType === "Attorney"
          ? `${participant.firstName} ${participant.lastName}`
          : participant.fullName,
    });

    await meeting.save();
    console.log("✅ Google Calendar event created:", meetLink);

    // ==========================
// 🔔 Create Notifications
// ==========================
try {
  // Notification for the participant
  if (participant) {
    await Notification.create({
      recipient: participant._id,
      recipientModel: creatorType === "Attorney" ? "Paralegal" : "Attorney",
      type: "meeting_scheduled",
      title: "New Meeting Scheduled",
      message: `${user.fullName || user.firstName + " " + user.lastName} scheduled a meeting with you titled "${title}"`,
      details: {
        action: "meeting_created",
        userName: user.fullName || user.firstName + " " + user.lastName,
      },
    });
  }

  // Notification for the creator
  await Notification.create({
    recipient: user._id,
    recipientModel: creatorType,
    type: "meeting_scheduled",
    title: "Meeting Created Successfully",
    message: `You scheduled a meeting with ${participant?.fullName || participant?.firstName + " " + participant?.lastName}`,
    details: {
      action: "meeting_created",
      userName: user.fullName || user.firstName + " " + user.lastName,
    },
  });

  console.log("✅ Notifications sent to both creator and participant");
} catch (notifError) {
  console.error("❌ Notification creation error:", notifError.message);
}

    res.json({ success: true, meetLink });
  } catch (error) {
    console.error("❌ Schedule meeting error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to schedule meeting" });
  }
};


// STEP 4: Get Upcoming Meetings
// STEP 4: Get All Meetings (Attorney or Paralegal)
exports.getAllMeetings = async (req, res) => {
  try {
    const now = new Date();
    const user = req.user;
    console.log("👤 Authenticated user:", user);

    const role = user.role === "attorney" ? "Attorney" : "Paralegal";

    // Fetch meetings where the user is either the creator or a participant
    const baseFilter = {
      $or: [
        {
          createdBy: new mongoose.Types.ObjectId(user._id),
          creatorType: role,
        },
        {
          participants: new mongoose.Types.ObjectId(user._id),
        },
      ],
    };

    const allMeetings = await Meeting.find(baseFilter)
      .sort({ startTime: 1 })
      .populate("createdBy", "fullName firstName lastName email")
      .populate("participants", "fullName firstName lastName email");

    console.log("🧩 All meetings found for user:", allMeetings.length);

    const upcoming = allMeetings.filter((m) => new Date(m.startTime) > now);
    const ongoing = allMeetings.filter(
      (m) => new Date(m.startTime) <= now && new Date(m.endTime) >= now
    );
    const past = allMeetings.filter((m) => new Date(m.endTime) < now);

    console.log(
      `✅ Upcoming: ${upcoming.length}, Ongoing: ${ongoing.length}, Past: ${past.length}`
    );

    res.json({ success: true, upcoming, ongoing, past });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Error fetching meetings" });
  }
};





exports.getGoogleStatus = async (req, res) => {
  const user = req.user;
  const userType = user.role === "attorney" ? "Attorney" : "Paralegal";

  const GoogleAuth = require("../models/GoogleAuth");
  const record = await GoogleAuth.findOne({ user: user._id, userType });
  res.json({ connected: !!record });
};
