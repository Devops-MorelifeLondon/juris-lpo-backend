// config/db.js
const mongoose = require('mongoose');

let isConnected = false; // Track connection status

const connectDB = async () => {
  // Set strict query mode
  mongoose.set('strictQuery', true);

  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'jurisLPO',
      maxPoolSize: 10, // Connection pool size
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err; // Don't exit process in serverless
  }
};

module.exports = connectDB;
