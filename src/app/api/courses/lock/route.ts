import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { queryD1, executeD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized. Please login first.' }, { status: 401 });
    }

    const body = await req.json();
    const courseId = body.course_id || body.courseId || body.locked_course_id;

    if (!courseId || typeof courseId !== 'string' || !courseId.trim()) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    const cleanCourseId = courseId.trim();

    // 1. Resolve Course from either D1 or sharedDb
    let matchedCourse: any = null;

    try {
      const d1Courses = await queryD1('SELECT id, name FROM courses WHERE id = ? LIMIT 1', [cleanCourseId]);
      if (d1Courses && d1Courses.length > 0) {
        matchedCourse = d1Courses[0];
      }
    } catch (e) {
      console.warn('[Courses Lock D1 course lookup warning]:', e);
    }

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

    if (!matchedCourse) {
      matchedCourse = {
        id: cleanCourseId,
        name: 'Selected Course Track',
      };
    }

    const authUserId = String(auth.userId || '');
    const authEmailLower = (auth.email || '').toLowerCase().trim();
    const authName = auth.name || authEmailLower.split('@')[0] || 'Student';

    // 2. Persist to Cloudflare D1
    try {
      await executeD1(
        'UPDATE users SET locked_course_id = ?, status = ? WHERE id = ? OR LOWER(email) = ? OR LOWER(account_email) = ?',
        [cleanCourseId, 'Active', authUserId, authEmailLower, authEmailLower]
      );
      await executeD1(
        'INSERT OR IGNORE INTO users (id, name, email, status, xp_total, locked_course_id) VALUES (?, ?, ?, ?, ?, ?)',
        [authUserId, authName, authEmailLower, 'Active', 0, cleanCourseId]
      );
    } catch (e) {
      console.warn('[Courses Lock D1 user update warning]:', e);
    }

    // 3. Persist to shared-db.json (with guaranteed Upsert)
    try {
      if (!db.users) db.users = [];
      const userIndex = db.users.findIndex(
        (u: any) =>
          (authUserId && (String(u._id) === authUserId || String(u.id) === authUserId)) ||
          (authEmailLower && (u.email?.toLowerCase().trim() === authEmailLower || u.account_email?.toLowerCase().trim() === authEmailLower))
      );

      if (userIndex !== -1) {
        db.users[userIndex].locked_course_id = cleanCourseId;
        db.users[userIndex].status = 'Active';
        if (!db.users[userIndex].id) db.users[userIndex].id = db.users[userIndex]._id;
      } else {
        // Upsert user into shared-db.json so course selection is never lost
        db.users.push({
          _id: authUserId,
          id: authUserId,
          name: authName,
          email: authEmailLower,
          status: 'Active',
          xp_total: 0,
          locked_course_id: cleanCourseId,
          created_at: new Date().toISOString(),
        });
      }
      writeSharedDb(db);
    } catch (dbErr) {
      console.error('[Courses Lock sharedDb error]:', dbErr);
    }

    // 4. Sign and issue updated token
    const token = signUserToken({
      userId: authUserId,
      email: authEmailLower,
      name: authName,
      lockedCourseId: cleanCourseId,
    });

    const response = NextResponse.json({
      success: true,
      course: {
        id: cleanCourseId,
        name: matchedCourse.name,
      },
      lockedCourseId: cleanCourseId,
    });

    response.cookies.set('student_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
