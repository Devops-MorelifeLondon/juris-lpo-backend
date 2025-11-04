const dotenv = require('dotenv');
const app = require('./app');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

const PORT = process.env.PORT || 5000;

console.log('STREAM_API_KEY:', process.env.STREAM_API_KEY);
console.log('STREAM_API_SECRET:', process.env.STREAM_API_SECRET ? 'Loaded ✅' : '❌ Missing');


if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
  throw new Error('STREAM API credentials missing — please check .env');
}

// ✅ Wait for MongoDB to connect before starting server
(async () => {
  try {
    await connectDB(); // ✅ <-- IMPORTANT
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
      console.error(`❌ Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      console.error(`💥 Uncaught Exception: ${err.message}`);
      server.close(() => process.exit(1));
    });

    process.on('SIGTERM', () => {
      console.log('🧹 SIGTERM received. Shutting down gracefully...');
      server.close(() => console.log('👋 Process terminated.'));
    });
  } catch (err) {
    console.error("❌ Failed to start server: Could not connect to MongoDB");
    console.error(err);
    process.exit(1);
  }
})();
