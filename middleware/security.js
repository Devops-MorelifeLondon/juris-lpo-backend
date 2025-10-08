// middleware/security.js
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Helmet - Set security headers
exports.helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  }
});

// Sanitize data - Prevent MongoDB Operator Injection
exports.mongoSanitize = mongoSanitize();

// Prevent XSS attacks
exports.xssClean = xss();

// Prevent HTTP Parameter Pollution
exports.hpp = hpp();
