import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { executeD1 } from '@/lib/d1';
import { User } from '@/lib/models';
import { dbConnect } from '@/lib/db';

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
      // User did not exist in database yet (e.g. pending Google OAuth signup)
      // Register them into the database NOW with the locked course!
      try {
        await executeD1(
          'INSERT INTO users (id, name, email, password_hash, status, xp_total, locked_course_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, name, emailLower, 'google_oauth_authenticated', 'Active', 0, cleanCourseId]
        );
      } catch (e) {
        console.warn('[course/select] D1 insert warning:', e);
      }

      // Memory DB sync
      try {
        const { isMemoryMode } = await dbConnect();
        if (isMemoryMode) {
          const db = readSharedDb();
          if (!db.users) db.users = [];
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
          writeSharedDb(db);
        } else {
          await User.create({
            name,
            email: emailLower,
            password_hash: 'google_oauth_authenticated',
            status: 'Active',
            xp_total: 0,
            locked_course_id: cleanCourseId,
          });
        }
      } catch (_) {}
    } else {
      const { user, isMemoryMode, isD1 } = authResult;

      // If user already has a locked course, keep it locked, update session token, and proceed
      if (user.locked_course_id) {
        const existingCourseId = String(user.locked_course_id);
        const resolvedUserId = user._id ? String(user._id) : userId;
        const newToken = signUserToken({
          userId: resolvedUserId,
          email: emailLower,
          name: user.name || name,
          lockedCourseId: existingCourseId,
        });

        const response = NextResponse.json({
          success: true,
          lockedCourseId: existingCourseId,
          alreadyLocked: true,
        });

        response.cookies.set('student_token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });

        return response;
      }

      // Update in Cloudflare D1
      await executeD1('UPDATE users SET locked_course_id = ? WHERE id = ? OR email = ?', [
        cleanCourseId,
        String(user._id || auth.userId),
        emailLower,
      ]);

      if (isMemoryMode) {
        const db = readSharedDb();
        const dbUser = (db.users || []).find((u: any) => String(u._id) === String(user._id) || String(u.email).toLowerCase() === emailLower);
        if (dbUser) {
          dbUser.locked_course_id = cleanCourseId;
          writeSharedDb(db);
        } else {
          user.locked_course_id = cleanCourseId;
        }
      } else if (!isD1 && user.save) {
        user.locked_course_id = cleanCourseId;
        await user.save();
      }
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
