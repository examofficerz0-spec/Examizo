import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null, isMemoryMode: false, lastAttempt: 0 };
}

export async function dbConnect() {
  if ((mongoose.connection.readyState as number) === 1) {
    cached.conn = mongoose.connection;
    cached.isMemoryMode = false;
    return { isMemoryMode: false, conn: cached.conn };
  }

  const now = Date.now();
  // If we are currently in memory mode, but haven't tried connecting for at least 10s, attempt reconnection
  if (cached.isMemoryMode && process.env.MONGODB_URI && (now - (cached.lastAttempt || 0) < 10000)) {
    return { isMemoryMode: true, conn: null };
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exammaster';
  cached.lastAttempt = now;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      })
      .then((conn) => {
        console.log('[DB] Connected successfully to MongoDB Atlas');
        cached.isMemoryMode = false;
        return conn;
      })
      .catch((err) => {
        console.warn('[DB] MongoDB Atlas connection timeout/pending. Falling back to resilient JSON database store:', err.message);
        cached.isMemoryMode = true;
        cached.promise = null;
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
    if (!cached.conn || (mongoose.connection.readyState as number) !== 1) {
      cached.isMemoryMode = true;
    } else {
      cached.isMemoryMode = false;
    }
  } catch (e) {
    cached.isMemoryMode = true;
    cached.promise = null;
  }

  return { isMemoryMode: cached.isMemoryMode, conn: cached.conn };
}

