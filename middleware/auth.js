const jwt = require("jsonwebtoken");
const Attorney = require("../models/Attorney");
const Paralegal = require("../models/Paralegal");

exports.protect = async (req, res, next) => {
  try {
    let token = null;

    // ✅ 1. Get token from header or cookie
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

   

    // ✅ 2. Validate token
    if (!token || token === "undefined" || token === "null") {
      return res.status(401).json({ success: false, message: "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const role = decoded.role;

    // ✅ 3. Identify user
    let user;
    if (role === "attorney") {
      user = await Attorney.findById(decoded.id).select("fullName email");
    } else {
      user = await Paralegal.findById(decoded.id).select("firstName lastName email");
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = { ...user.toObject(), role };
 
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
