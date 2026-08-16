import { dbConnect } from '@/lib/db';
import { User } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { UserPayload } from '@/lib/auth';
import { queryD1 } from '@/lib/d1';
import mongoose from 'mongoose';

export interface UserLookupResult {
  user: any;
  isMemoryMode: boolean;
  isD1?: boolean;
}

export async function getUserFromAuth(auth: UserPayload | null): Promise<UserLookupResult | null> {
  if (!auth) return null;

  const emailLower = auth.email ? auth.email.toLowerCase().trim() : '';
  const userIdStr = auth.userId ? String(auth.userId) : '';

  // 1. Try Cloudflare D1 database lookup first
  try {
    const d1Users = await queryD1('SELECT * FROM users WHERE id = ? OR email = ? LIMIT 1', [userIdStr, emailLower]);
    if (d1Users && d1Users.length > 0) {
      const u = d1Users[0];
      const isSuspended = u.status === 'Suspended' || u.status === 'suspended' || u.status === 'SUSPENDED';
      const isDeleted = u.status === 'Deleted' || u.name === 'Deleted User' || (u.email && u.email.startsWith('deleted_'));
      if (isDeleted || isSuspended) {
        return null;
      }
      return {
        user: {
          _id: u.id,
          id: u.id,
          name: u.name,
          email: u.email,
          password_hash: u.password_hash,
          account_email: u.account_email || (u.email.includes('+profile_') ? `${u.email.split('+profile_')[0]}@${u.email.split('@')[1] || 'exammaster.internal'}` : u.email),
          locked_course_id: u.locked_course_id || null,
          status: u.status || 'Active',
          xp_total: u.xp_total || 0,
        },
        isMemoryMode: false,
        isD1: true,
      };
    }
  } catch (e) {
    console.warn('[getUserFromAuth] D1 lookup warning:', e);
  }

  // 2. Try Mongoose Mode lookup if Mongo connection is present
  try {
    const { isMemoryMode } = await dbConnect();
    if ((mongoose.connection.readyState as number) === 1 || !isMemoryMode) {
      let user = null;
      if (auth.userId && mongoose.Types.ObjectId.isValid(auth.userId)) {
        user = await User.findById(auth.userId);
      }
      if (!user && auth.userId) {
        user = await User.findOne({ _id: auth.userId });
      }
      if (!user && emailLower) {
        user = await User.findOne({ email: emailLower });
      }
      if (!user && emailLower) {
        user = await User.findOne({ account_email: emailLower });
      }
      if (user) {
        const isSuspended = String(user.status || '').toLowerCase() === 'suspended';
        const isDeleted = String(user.status || '').toLowerCase() === 'deleted' || user.name === 'Deleted User' || (user.email && user.email.startsWith('deleted_'));
        if (isDeleted || isSuspended) {
          return null;
        }
        return { user, isMemoryMode: false };
      }
    }
  } catch (e) {
    console.warn('[getUserFromAuth] Mongoose lookup warning:', e);
  }

  // 3. Memory DB mode lookup
  try {
    const db = readSharedDb();
    if (db && db.users) {
      let memUser = db.users.find(
        (u: any) => String(u._id) === userIdStr || String(u.id) === userIdStr
      );

      if (!memUser && emailLower) {
        memUser = db.users.find(
          (u: any) =>
            (u.email && u.email.toLowerCase() === emailLower) ||
            (u.account_email && u.account_email.toLowerCase() === emailLower)
        );
      }

      if (memUser) {
        const isSuspended = memUser.status === 'Suspended' || memUser.status === 'suspended' || memUser.status === 'SUSPENDED';
        const isDeleted = memUser.status === 'Deleted' || memUser.name === 'Deleted User' || (memUser.email && memUser.email.startsWith('deleted_'));
        if (isDeleted || isSuspended) {
          return null;
        }
        return { user: memUser, isMemoryMode: true };
      }
    }
  } catch (e) {
    console.warn('[getUserFromAuth] Memory DB lookup warning:', e);
  }

  return null;
}
