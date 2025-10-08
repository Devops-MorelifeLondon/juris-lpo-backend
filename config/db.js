// config/db.js
const mongoose = require('mongoose');

let cached = global.mongoose || { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        dbName: "jurisLPO", // optional: your DB name
        bufferCommands: false,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  cached.conn = await cached.promise;
  global.mongoose = cached;
  return cached.conn;
}

module.exports = connectDB;
