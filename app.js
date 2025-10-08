const express = require('express');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const corsConfig = require('./middleware/cors');
const { helmetConfig, xssClean, hpp } = require('./middleware/security');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');


const app = express();
app.use(errorHandler);

// ✅ 1. Enable CORS FIRST (before anything else)
app.use(corsConfig);

// ✅ 2. Body + Cookie parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());



// ✅ 4. Rate limiting AFTER CORS + before routes
app.use('/api/', apiLimiter);

// ✅ 5. Health route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ✅ 6. Main API routes
app.use('/api/attorney/auth', require('./routes/attorney.auth.routes'));

// ✅ 7. 404 + error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
