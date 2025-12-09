// routes/publicRequestRoutes.js

const express = require("express");

const {
  handleProfileRequest,
  handleRecentWorkRequest,
  handleInterviewBooking,
  handleCustomRequirement,
  handleConsultationRequest
} = require("../controllers/publicrequest.controller");

const router = express.Router();

// Public Site Routes
router.post("/request-profile", handleProfileRequest);
router.post("/request-recent-work", handleRecentWorkRequest);
router.post("/book-interview", handleInterviewBooking);

// Custom Requirement Form
router.post("/submit-requirement", handleCustomRequirement);
router.post("/request-consultation", handleConsultationRequest);


module.exports = router;
