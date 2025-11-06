const { google } = require("googleapis");
require("dotenv").config(); // ✅ load .env variables

// ✅ Create OAuth2 client with credentials from .env
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const getAuthUrl = () => {
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  console.log("🔗 Google Auth URL generated:", url); // ✅ Debug line
  return url;
};

module.exports = { oauth2Client, getAuthUrl };
