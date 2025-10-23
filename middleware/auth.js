const jwt = require("jsonwebtoken");
const Attorney = require('../models/Attorney');
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

    console.log("Token :", req.headers.authorization)


    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    let user;
    if(decoded.role == 'attorney'){
       user = await Attorney.findById(decoded.id).select("fullName email");
    }else{
       user = await Paralegal.findById(decoded.id).select("fullName email");
    }
   

    
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
