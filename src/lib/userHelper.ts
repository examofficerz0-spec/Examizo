import { dbConnect } from '@/lib/db';
import { User } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { UserPayload } from '@/lib/auth';
import mongoose from 'mongoose';

export interface UserLookupResult {
  user: any;
  isMemoryMode: boolean;
}

export async function getUserFromAuth(auth: UserPayload | null): Promise<UserLookupResult | null> {
  if (!auth) return null;

  const { isMemoryMode } = await dbConnect();
  const emailLower = auth.email ? auth.email.toLowerCase().trim() : '';

  // 1. Try Mongoose Mode lookup first if Mongo is connected or available
  try {
    if ((mongoose.connection.readyState as number) === 1 || !isMemoryMode) {
      let user = null;

      // Try lookup by auth.userId if valid ObjectId
      if (auth.userId && mongoose.Types.ObjectId.isValid(auth.userId)) {
        user = await User.findById(auth.userId);
      }

      // Try lookup by auth.userId string
      if (!user && auth.userId) {
        user = await User.findOne({ _id: auth.userId });
      }

      // Fallback lookup by email
      if (!user && emailLower) {
        user = await User.findOne({ email: emailLower });
      }

      // Fallback lookup by account_email
      if (!user && emailLower) {
        user = await User.findOne({ account_email: emailLower });
      }

      if (user) {
        return { user, isMemoryMode: false };
      }
    }
  } catch (e) {
    console.warn('[getUserFromAuth] Mongoose lookup warning:', e);
  }

  // 2. Try Memory DB mode lookup
  try {
    const db = readSharedDb();
    if (db && db.users) {
      let memUser = db.users.find(
        (u: any) => String(u._id) === String(auth.userId) || String(u.id) === String(auth.userId)
      );

      if (!memUser && emailLower) {
        memUser = db.users.find(
          (u: any) =>
            (u.email && u.email.toLowerCase() === emailLower) ||
            (u.account_email && u.account_email.toLowerCase() === emailLower)
        );
      }

      if (memUser) {
        return { user: memUser, isMemoryMode: true };
      }
    }
  } catch (e) {
    console.warn('[getUserFromAuth] Memory DB lookup warning:', e);
  }

  // 3. Fallback: If Mongoose connection was offline during initial check, try connecting once more if MONGODB_URI exists
  try {
    if (process.env.MONGODB_URI && (mongoose.connection.readyState as number) !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      let user = null;
      if (auth.userId && mongoose.Types.ObjectId.isValid(auth.userId)) {
        user = await User.findById(auth.userId);
      }
      if (!user && emailLower) {
        user = await User.findOne({ email: emailLower });
      }
      if (user) {
        return { user, isMemoryMode: false };
      }
    }
  } catch (e) {
    // Secondary connection retry failed, ignore
  }

  return null;
}
