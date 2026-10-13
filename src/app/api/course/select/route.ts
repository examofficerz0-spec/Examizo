import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1, executeD1, ensureD1Tables } from '@/lib/d1';

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const courseId = body.courseId || body.course_id || body.locked_course_id;
    if (!courseId || !String(courseId).trim()) {
      return NextResponse.json({ error: 'Course selection is required' }, { status: 400 });
    }

    const cleanCourseId = String(courseId).trim();
    const emailLower = (auth.email || '').toLowerCase().trim();
    const userId = String(auth.userId || generateId());
    const name = auth.name || emailLower.split('@')[0] || 'Student';

    // 1. Resolve Course from either D1 or sharedDb
    let matchedCourse: any = null;
    try {
      const d1Courses = await queryD1('SELECT id, name FROM courses WHERE id = ? LIMIT 1', [cleanCourseId]);
      if (d1Courses && d1Courses.length > 0) {
        matchedCourse = d1Courses[0];
      }
    } catch (_) {}

    const db = readSharedDb();
    if (!matchedCourse && db.courses) {
      const memCourse = db.courses.find(
        (c: any) => String(c._id) === cleanCourseId || String(c.id) === cleanCourseId
      );
      if (memCourse) {
        matchedCourse = {
          id: String(memCourse._id || memCourse.id),
          name: memCourse.name,
        };
      }
    }

    // 2. Cloudflare D1 Update & Upsert
    try {
      await ensureD1Tables();
      await executeD1(
        'UPDATE users SET locked_course_id = ?, status = ? WHERE id = ? OR LOWER(email) = ?',
        [cleanCourseId, 'Active', userId, emailLower]
      );
      try {
        await executeD1(
          'UPDATE users SET locked_course_id = ?, status = ? WHERE LOWER(account_email) = ? AND (id = ? OR LOWER(email) = ?)',
          [cleanCourseId, 'Active', emailLower, userId, emailLower]
        );
      } catch (_) {}
      await executeD1(
        'INSERT OR IGNORE INTO users (id, name, email, status, xp_total, locked_course_id) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, name, emailLower, 'Active', 0, cleanCourseId]
      );
    } catch (e) {
      console.warn('[course/select] D1 warning:', e);
    }

    // 3. Shared DB Update & Upsert
    try {
      if (!db.users) db.users = [];
      let userIndex = -1;
      if (userId) {
        userIndex = db.users.findIndex(
          (u: any) => String(u._id) === userId || String(u.id) === userId
        );
      }
      if (userIndex === -1 && emailLower) {
        userIndex = db.users.findIndex(
          (u: any) => (u.email || '').toLowerCase().trim() === emailLower
        );
      }
      if (userIndex === -1 && emailLower) {
        userIndex = db.users.findIndex(
          (u: any) => (u.account_email || '').toLowerCase().trim() === emailLower
        );
      }

      if (userIndex !== -1) {
        db.users[userIndex].locked_course_id = cleanCourseId;
        db.users[userIndex].status = 'Active';
        if (!db.users[userIndex].id) db.users[userIndex].id = db.users[userIndex]._id;
      } else {
        db.users.push({
          _id: userId,
          id: userId,
          name,
          email: emailLower,
          status: 'Active',
          xp_total: 0,
          locked_course_id: cleanCourseId,
          created_at: new Date().toISOString(),
        });
      }
      writeSharedDb(db);
    } catch (dbErr) {
      console.error('[course/select] sharedDb error:', dbErr);
    }

    const newToken = signUserToken({
      userId,
      email: emailLower,
      name,
      lockedCourseId: cleanCourseId,
    });

    const response = NextResponse.json({
      success: true,
      course: {
        id: cleanCourseId,
        name: matchedCourse?.name || 'Selected Course Track',
      },
      lockedCourseId: cleanCourseId,
    });

    response.cookies.set('student_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
  }
}
