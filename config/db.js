// config/db.js
const mongoose = require('mongoose');

let cached = global.mongoose || { conn: null, promise: null };

async function connectDB() {
  console.log("🔍 MONGODB_URI =", process.env.MONGODB_URI ? "✅ Loaded" : "❌ Missing");
  console.log("🔍 MONGODB_URI =", process.env.MONGODB_URI );

  if (cached.conn) {
    console.log("🟢 [DB] Using existing MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("🟡 [DB] Creating new MongoDB connection...");

    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        dbName: "jurisLPO",
        bufferCommands: false,
      })
      .then((mongooseInstance) => {
        console.log("✅ [DB] MongoDB connected successfully:", mongooseInstance.connection.host);
        return mongooseInstance;
      })
      .catch((err) => {
        console.error("❌ [DB] MongoDB connection error:", err.message);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    console.error("🚨 [DB] Connection failed:", err);
    throw err;
  }

  global.mongoose = cached;
  return cached.conn;
}

module.exports = connectDB;
