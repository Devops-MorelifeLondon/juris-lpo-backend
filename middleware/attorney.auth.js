// middleware/attorney.auth.js
const jwt = require('jsonwebtoken');
const Attorney = require('../models/Attorney');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if role is attorney
      if (decoded.role !== 'attorney') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Attorney access only.'
        });
      }

      // Get attorney from token
      const attorney = await Attorney.findById(decoded.id);

      if (!attorney) {
        return res.status(404).json({
          success: false,
          message: 'Attorney not found'
        });
      }

      // Check if account is active
      if (!attorney.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact support.'
        });
      }

      // Attach attorney to request object
      req.attorney = attorney;
      next();

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      error: error.message
    });
  }
};

// Check if profile is completed (optional middleware)
exports.requireCompleteProfile = async (req, res, next) => {
  try {
    if (!req.attorney) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.attorney.profileCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Please complete your profile to access this feature',
        profileCompleted: false
      });
    }

    next();

  } catch (error) {
    console.error('Profile completion check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Check if email is verified (optional middleware)
exports.requireVerifiedEmail = async (req, res, next) => {
  try {
    if (!req.attorney) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.attorney.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email to access this feature',
        isVerified: false
      });
    }

    next();

  } catch (error) {
    console.error('Email verification check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
