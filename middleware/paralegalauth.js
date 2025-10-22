const jwt = require("jsonwebtoken");
const Paralegal = require("../models/Paralegal");

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    console.log(token);

    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    // Verify token
    console.log("TOKEN : ", token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("DECODE : ", decoded);
   

    // Fetch user from DB
    const user = await Paralegal.findById(decoded.id).select("fullName email");
    console.log(user);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }
    user.role = decoded.role;

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
