// models/PublicRequest.js

const mongoose = require("mongoose");

const PublicRequestSchema = new mongoose.Schema(
  {
    // 🔹 Type of request
    requestType: {
      type: String,
      enum: ["profile", "recentWork", "interview", "customRequirement"],
      required: true,
    },

    // 🔹 Basic user details
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },
 status: {
    type: String,
    enum: ["Pending", "In Progress", "Resolved", "consultation"],
    default: "Pending"
},


    // 🔹 Interview booking fields (if applicable)
    interview: {
      date: { type: String, default: null },
      time: { type: String, default: null },
      mode: { type: String, default: null }, // online/offline/phone call
    },

    // 🔹 Custom requirement fields (Drop Your Requirement)
    requirement: {
      service: { type: String, default: null },
      description: { type: String, default: null },
      urgency: {
        type: String,
        enum: [
          "Standard (3-5 days)",
          "Priority (24-48 hrs)",
          "Express (Same day)",
          null,
        ],
        default: null,
      },
    },

    // 🔹 Meta Information
    userIP: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PublicRequest", PublicRequestSchema);
