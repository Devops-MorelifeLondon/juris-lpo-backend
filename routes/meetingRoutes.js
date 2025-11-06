const express = require("express");
const router = express.Router();
const {
  getGoogleAuthUrl,
  googleCallback,
  scheduleMeeting,
  getGoogleStatus,
  getAllMeetings,
} = require("../controllers/meetingController");
const { protect } = require("../middleware/auth");

// 🔓 Public routes — no token needed
router.get("/google/auth", getGoogleAuthUrl);
router.get("/google/callback", googleCallback);

// ✅ Apply protect before all secure routes
router.use(protect);

// 🔒 Protected routes (JWT required)
router.get("/google/status", getGoogleStatus);
router.post("/schedule", scheduleMeeting);
router.get("/meetings/all", getAllMeetings);

module.exports = router;
