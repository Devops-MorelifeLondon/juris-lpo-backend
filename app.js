const express = require('express');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const corsConfig = require('./middleware/cors');
const { helmetConfig, xssClean, hpp } = require('./middleware/security');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const chatRoutes = require('./routes/chatRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const trainingProgressRoutes = require("./routes/trainingProgressRoutes");
const trainingCommentRoutes = require("./routes/trainingCommentRoutes");



const app = express();
app.use(corsConfig);
app.set('trust proxy', 1);

// ✅ 1. Enable CORS FIRST (before anything else)

// ✅ 2. Body + Cookie parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.get('/', async (req,res)=>{
  res.status(200).json({
    message: "server working fine"
  })
})



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
app.use("/api/home", require('./routes/publicRequestRoutes.routes'));
app.use('/api/dashboard', require('./routes/paralegaldash.routes'));
app.use('/api/attorney/auth', require('./routes/attorney.auth.routes'));
app.use('/api/cases', require('./routes/case.routes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/paralegals', require('./routes/paralegal.auth.routes'));
app.use('/api/notifications', require('./routes/notificationsRoutes'));
app.use('/api/training', require('./routes/trainingRoutes'));
// Routes
app.use('/api/chat', chatRoutes);
app.use('/api', meetingRoutes);


app.use("/api/training/progress", trainingProgressRoutes);
app.use("/api/training/comments", trainingCommentRoutes);
app.use("/api/ai", require('./routes/trainingAI'));
app.use("/api/time-entries", require('./routes/timeEntryRoutes'));
app.use("/api/billing", require('./routes/billingRoutes'));
app.use("/api", require('./routes/paymentRoutes'));





// ✅ 7. 404 + error handlers
app.use(notFound);
app.use(errorHandler);


module.exports = app;
