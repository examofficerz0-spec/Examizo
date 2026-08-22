import { readSharedDb } from '@/lib/sharedDb';
import { UserPayload } from '@/lib/auth';
import { queryD1 } from '@/lib/d1';

export interface UserLookupResult {
  user: any;
  isMemoryMode: boolean;
  isD1?: boolean;
}

export async function getUserFromAuth(auth: UserPayload | null): Promise<UserLookupResult | null> {
  if (!auth) return null;

  const emailLower = auth.email ? auth.email.toLowerCase().trim() : '';
  const userIdStr = auth.userId ? String(auth.userId) : '';

  // 1. Primary: Cloudflare D1 database lookup
  try {
    const d1Users = await queryD1('SELECT * FROM users WHERE id = ? OR LOWER(email) = ? LIMIT 1', [userIdStr, emailLower]);
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

  // 2. Resilient Local Memory DB fallback
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

  // 3. Resilient JWT Payload Fallback
  // If the JWT token was cryptographically verified, safely construct user from token claims
  // so temporary DB delays/sync gaps do not falsely destroy user authentication sessions.
  if (auth && (auth.userId || auth.email)) {
    return {
      user: {
        _id: auth.userId || 'student_authenticated',
        id: auth.userId || 'student_authenticated',
        name: auth.name || (auth.email ? auth.email.split('@')[0] : 'Student'),
        email: auth.email || '',
        account_email: auth.email || '',
        locked_course_id: auth.lockedCourseId || null,
        status: 'Active',
        xp_total: 0,
      },
      isMemoryMode: true,
    };
  }

  return null;
}

