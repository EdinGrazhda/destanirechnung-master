import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

// When MongoDB Atlas silently closes an idle connection (typically after ~1 hour),
// reset the cache so the next request opens a fresh connection
// instead of reusing a dead socket that will hang until timeout.
mongoose.connection.on("disconnected", () => {
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on("error", () => {
  cached.conn = null;
  cached.promise = null;
});

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        // Ping Atlas every 30s to keep connections alive and detect drops early.
        // Without this, Atlas closes idle connections after ~1h and
        // the app hangs on the next request until socketTimeoutMS fires.
        heartbeatFrequencyMS: 30000,
        // Force IPv4 — avoids IPv6 DNS resolution delays on some VPS hosts.
        family: 4,
      })
      .catch((err) => {
        // Allow a clean retry on the next request if the initial connect fails.
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
