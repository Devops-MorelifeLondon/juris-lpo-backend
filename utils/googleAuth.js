// utils/googleAuth.js
const { google } = require("googleapis");
require("dotenv").config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ✅ Update this function to accept 'state'
const getAuthUrl = (state) => {
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // This ensures you get the refresh token
    scope: scopes,
    state: state,      // Pass the JWT token here
  });
};

module.exports = { oauth2Client, getAuthUrl };