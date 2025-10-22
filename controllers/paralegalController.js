// controllers/paralegalController.js
const Paralegal = require('../models/Paralegal');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const connectDB = require('../config/db');
const { OAuth2Client } = require('google-auth-library');


const generateToken = (id) => {
  return jwt.sign({ id, role: 'paralegal' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const sendTokenResponse = (paralegal, statusCode, res) => {
  const token = generateToken(paralegal._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Update last login
  paralegal.lastLogin = Date.now();
  paralegal.save({ validateBeforeSave: false });

  res.status(statusCode).cookie('token', token, cookieOptions).json({
    success: true,
    token,
    data: {
      firstName: paralegal.firstName,
      lastName: paralegal.lastName,
      email: paralegal.email,
    }
  });
};

// Create a new paralegal
exports.createParalegal = async (req, res) => {
  try {
    console.log(req.body);
    const { firstName, lastName, email, password, confirmPassword } = req.body;
    const paralegal = new Paralegal({ firstName, lastName, email, password });
    await paralegal.save();

    sendTokenResponse(paralegal, 201, res);
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get all paralegals
exports.getAllParalegals = async (req, res) => {
  try {
    const paralegals = await Paralegal.find();
    res.status(200).json({ success: true, data: paralegals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get paralegal by ID
exports.getParalegalById = async (req, res) => {
  try {
    const { _id } = req.user;
    const paralegal = await Paralegal.findById(_id);

    if (!paralegal) {
      return res.status(404).json({ success: false, error: 'Paralegal not found' });
    }
    res.status(200).json({ success: true, data: paralegal });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update paralegal by ID
exports.updateParalegal = async (req, res) => {
  try {
    const { _id } = req.user;
    const paralegal = await Paralegal.findByIdAndUpdate(_id, req.body, {
      new: true,
      runValidators: true
    });
    if (!paralegal) {
      return res.status(404).json({ success: false, error: 'Paralegal not found' });
    }
    res.status(200).json({ success: true, data: paralegal });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete paralegal by ID
exports.deleteParalegal = async (req, res) => {
  try {
    const paralegal = await Paralegal.findByIdAndDelete(req.params.id);
    if (!paralegal) {
      return res.status(404).json({ success: false, error: 'Paralegal not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Paralegal login
exports.loginParalegal = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);
    const paralegal = await Paralegal.findOne({ email }).select('+password');
    if (!paralegal) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await paralegal.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // You can generate a JWT token here for authentication

    sendTokenResponse(paralegal, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.googlelogin = async (req, res) => {
  try {
    await connectDB();
    console.log("It is trigeered");
    const { credential } = req.body; // JWT token from Google frontend
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required"
      });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name: fullName, picture } = payload;

    const parts = fullName.trim().split(" ");
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token"
      });
    }

    // Check if attorney already exists
    let paralegal = await Paralegal.findOne({ email });

    if (!paralegal) {
      // Create new attorney
      const verificationToken = crypto.randomBytes(32).toString("hex");
      paralegal = await Paralegal.create({
        firstName,
        lastName,
        email,
        avatar: picture
      });

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/paralegal/verify-email/${verificationToken}`;
      try {
        await sendBrevoEmailApi({
          to_email: { email, name: fullName },
          email_subject: "Verify Your Juris-LPO Paralegal Account",
          htmlContent: emailTemplates.attorneyVerificationTemplate(fullName, verificationUrl)
        });
        console.log("📧 Verification email sent to:", email);
      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError.message);
      }
    }

    // Send JWT token to frontend
    sendTokenResponse(paralegal, 200, res);

  } catch (error) {
    console.error("💥 Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during Google login",
      error: error.message
    });
  }
};

// controllers/paralegalController.js
exports.availableStatus = async (req, res) => {
  try {
    const { _id } = req.user;

    // GET request → return availability
    if (req.method === 'GET') {
      const paralegal = await Paralegal.findById(_id).select('availability');
      if (!paralegal) {
        return res.status(404).json({ success: false, error: 'Paralegal not found' });
      }
      return res.status(200).json({ success: true, status: paralegal.availability });
    }

    // PATCH request → update availability
    if (req.method === 'PATCH') {
      const { availability } = req.body;

      // Validate incoming value
      const validStatuses = ['Available Now', 'Available Soon', 'Fully Booked', 'Not Available'];
      if (!validStatuses.includes(availability)) {
        return res.status(400).json({ success: false, error: 'Invalid availability status' });
      }

      const paralegal = await Paralegal.findByIdAndUpdate(
        _id,
        { availability },
        { new: true, runValidators: true }
      );

      if (!paralegal) {
        return res.status(404).json({ success: false, error: 'Paralegal not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Availability updated successfully',
        status: paralegal.availability,
      });
    }

    // Fallback
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

