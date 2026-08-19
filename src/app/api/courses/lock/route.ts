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

    // 1. Primary: Cloudflare D1
    try {
      const d1Courses = await queryD1('SELECT id, name FROM courses WHERE id = ? LIMIT 1', [cleanCourseId]);
      if (d1Courses && d1Courses.length > 0) {
        const matchedCourse = d1Courses[0];

        await executeD1('UPDATE users SET locked_course_id = ?, status = ? WHERE id = ? OR LOWER(email) = ?', [
          cleanCourseId,
          'Active',
          String(auth.userId),
          auth.email.toLowerCase().trim(),
        ]);

        // Mirror to sharedDb for local consistency
        try {
          const db = readSharedDb();
          if (db.users) {
            const userIndex = (db.users || []).findIndex(
              (u: any) => String(u._id) === String(auth.userId) || String(u.id) === String(auth.userId) || u.email?.toLowerCase() === auth.email?.toLowerCase()
            );
            if (userIndex !== -1) {
              db.users[userIndex].locked_course_id = cleanCourseId;
              db.users[userIndex].status = 'Active';
              writeSharedDb(db);
            }
          }
        } catch (_) {}

        const token = signUserToken({
          userId: auth.userId,
          email: auth.email,
          name: auth.name,
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
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
          sameSite: 'lax',
        });

        return response;
      }
    } catch (e) {
      console.warn('[Courses Lock D1 Error]:', e);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const course = (db.courses || []).find((c: any) => String(c._id) === cleanCourseId || String(c.id) === cleanCourseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const userIndex = (db.users || []).findIndex(
      (u: any) => String(u._id) === String(auth.userId) || String(u.id) === String(auth.userId) || u.email?.toLowerCase() === auth.email?.toLowerCase()
    );

    if (userIndex !== -1) {
      db.users[userIndex].locked_course_id = cleanCourseId;
      db.users[userIndex].status = 'Active';
      writeSharedDb(db);
    }

    const token = signUserToken({
      userId: auth.userId,
      email: auth.email,
      name: auth.name,
      lockedCourseId: cleanCourseId,
    });

    const response = NextResponse.json({
      success: true,
      course: {
        id: cleanCourseId,
        name: course.name,
      },
      lockedCourseId: cleanCourseId,
    });

    response.cookies.set('student_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
