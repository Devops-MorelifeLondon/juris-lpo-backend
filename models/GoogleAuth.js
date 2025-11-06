const mongoose = require("mongoose");

const googleAuthSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "userType",
    required: true,
  },
  userType: {
    type: String,
    enum: ["Attorney", "Paralegal"],
    required: true,
  },
  accessToken: String,
  refreshToken: String,
  expiryDate: Number,
});

module.exports = mongoose.model("GoogleAuth", googleAuthSchema);
