const jwt = require("jsonwebtoken");
const Attorney = require("../models/Attorney");
const Paralegal = require("../models/Paralegal");

exports.protect = async (req, res, next) => {
  try {
    let token = null;

    // 1. Get token from header or cookie
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    console.log("Token:", token);

    // 2. Validate token existence
    if (!token || token === "undefined" || token === "null") {
      return res.status(401).json({ success: false, message: "Token missing" });
    }

    // 3. Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }

    // 4. Verify user role & find user
    let user = null;

    if (decoded.role === "attorney") {
      user = await Attorney.findById(decoded.id).select("fullName email");
    } else if (decoded.role === "paralegal") {
      user = await Paralegal.findById(decoded.id).select("firstName lastName email");
    } else {
      return res.status(401).json({ success: false, message: "Invalid role" });
    }

    // 5. If user does not exist → unauthorized
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    // 6. Attach to request object
    req.user = { ...user.toObject(), role: decoded.role };

    console.log("REQ USER:", req.user);

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
