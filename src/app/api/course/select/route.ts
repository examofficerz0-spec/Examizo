import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { executeD1 } from '@/lib/d1';

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId } = await req.json();
    if (!courseId || !String(courseId).trim()) {
      return NextResponse.json({ error: 'Course selection is required' }, { status: 400 });
    }

    const cleanCourseId = String(courseId).trim();
    const emailLower = (auth.email || '').toLowerCase().trim();
    const userId = String(auth.userId || generateId());
    const name = auth.name || emailLower.split('@')[0];

    const authResult = await getUserFromAuth(auth);

    if (!authResult || !authResult.user) {
      // 1. New user registration completion (e.g. from Google OAuth pending token)
      // Insert into Cloudflare D1
      try {
        await executeD1(
          'INSERT INTO users (id, name, email, password_hash, status, xp_total, locked_course_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, name, emailLower, 'google_oauth_authenticated', 'Active', 0, cleanCourseId]
        );
      } catch (e) {
        console.warn('[course/select] D1 insert warning:', e);
      }

      // Memory DB insert
      try {
        const db = readSharedDb();
        if (!db.users) db.users = [];
        const existingIdx = db.users.findIndex((u) => u.email?.toLowerCase() === emailLower || String(u._id) === userId);
        if (existingIdx >= 0) {
          db.users[existingIdx].locked_course_id = cleanCourseId;
          db.users[existingIdx].status = 'Active';
        } else {
          db.users.push({
            _id: userId,
            name,
            email: emailLower,
            password_hash: 'google_oauth_authenticated',
            status: 'Active',
            xp_total: 0,
            locked_course_id: cleanCourseId,
            created_at: new Date().toISOString(),
          });
        }
        writeSharedDb(db);
      } catch (_) {}
    } else {
      const { user } = authResult;
      const targetUserId = String(user._id || user.id || auth.userId);

      // Update in Cloudflare D1
      try {
        await executeD1('UPDATE users SET locked_course_id = ?, status = ? WHERE id = ? OR email = ?', [
          cleanCourseId,
          'Active',
          targetUserId,
          emailLower,
        ]);
      } catch (_) {}

      // Update in Memory DB
      try {
        const db = readSharedDb();
        if (db.users) {
          const dbUser = db.users.find(
            (u: any) => String(u._id) === targetUserId || String(u.id) === targetUserId || String(u.email).toLowerCase() === emailLower
          );
          if (dbUser) {
            dbUser.locked_course_id = cleanCourseId;
            dbUser.status = 'Active';
            writeSharedDb(db);
          }
        }
      } catch (_) {}
    }

    const newToken = signUserToken({
      userId,
      email: emailLower,
      name,
      lockedCourseId: cleanCourseId,
    });

    const response = NextResponse.json({ success: true, lockedCourseId: cleanCourseId });
    response.cookies.set('student_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
  }
}
