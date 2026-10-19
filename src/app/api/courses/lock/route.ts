import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { queryD1, executeD1, ensureD1Tables } from '@/lib/d1';

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
    const courseData = body.courseData;

    // Auto-create / persist course if new curriculum track metadata is passed
    if (courseData && courseData.courseName) {
      try {
        const existingD1Courses = await queryD1(
          'SELECT id FROM courses WHERE id = ? OR name = ?',
          [cleanCourseId, String(courseData.courseName).trim()]
        );
        if (!existingD1Courses || existingD1Courses.length === 0) {
          await executeD1(
            `INSERT OR IGNORE INTO courses (id, name, description, category, board, curriculum, subjects_json, marks_per_correct, penalty_per_incorrect, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 4.0, 1.0, 1, ?)`,
            [
              cleanCourseId,
              String(courseData.courseName).trim(),
              `${courseData.courseName} preparation and assessment curriculum`,
              courseData.category === 'School Exams' ? 'School Exams' : 'Competitive Exams',
              courseData.board || 'CBSE',
              courseData.classGrade || courseData.examName || '',
              JSON.stringify(courseData.subjects || []),
              new Date().toISOString(),
            ]
          );
        }
      } catch (cErr) {
        console.warn('[Courses Lock D1 auto-create warning]:', cErr);
      }

      try {
        const sDb = readSharedDb();
        if (sDb && Array.isArray(sDb.courses)) {
          const exists = sDb.courses.some(
            (c: any) => String(c.id) === cleanCourseId || String(c._id) === cleanCourseId || c.name === courseData.courseName
          );
          if (!exists) {
            sDb.courses.push({
              _id: cleanCourseId,
              id: cleanCourseId,
              name: String(courseData.courseName).trim(),
              description: `${courseData.courseName} preparation and assessment curriculum`,
              category: courseData.category === 'School Exams' ? 'School Exams' : 'Competitive Exams',
              board: courseData.board || 'CBSE',
              curriculum: courseData.classGrade || courseData.examName || '',
              subjects: Array.isArray(courseData.subjects) ? courseData.subjects : [],
              marks_per_correct: 4.0,
              penalty_per_incorrect: 1.0,
              is_active: true,
              created_at: new Date().toISOString(),
            });
            writeSharedDb(sDb);
          }
        }
      } catch (_) {}
    }

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
      await ensureD1Tables();
      await executeD1(
        'UPDATE users SET locked_course_id = ?, status = ? WHERE id = ? OR LOWER(email) = ?',
        [cleanCourseId, 'Active', authUserId, authEmailLower]
      );
      try {
        await executeD1(
          'UPDATE users SET locked_course_id = ?, status = ? WHERE LOWER(account_email) = ? AND (id = ? OR LOWER(email) = ?)',
          [cleanCourseId, 'Active', authEmailLower, authUserId, authEmailLower]
        );
      } catch (_) {}
      try {
        await executeD1(
          'UPDATE sub_profiles SET locked_course_id = ?, status = ? WHERE id = ? OR (parent_user_id = ? AND is_primary = 1)',
          [cleanCourseId, 'Active', authUserId, authUserId]
        );
      } catch (_) {}
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
      // Prioritize exact user ID first, then exact email, then account_email
      let userIndex = -1;
      if (authUserId) {
        userIndex = db.users.findIndex(
          (u: any) => String(u._id) === authUserId || String(u.id) === authUserId
        );
      }
      if (userIndex === -1 && authEmailLower) {
        userIndex = db.users.findIndex(
          (u: any) => (u.email || '').toLowerCase().trim() === authEmailLower
        );
      }
      if (userIndex === -1 && authEmailLower) {
        userIndex = db.users.findIndex(
          (u: any) => (u.account_email || '').toLowerCase().trim() === authEmailLower
        );
      }

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

      // Also sync sub_profiles in sharedDb
      if (db.sub_profiles) {
        const subIndex = db.sub_profiles.findIndex(
          (sp: any) => String(sp.id || sp._id) === authUserId || (String(sp.parent_user_id) === authUserId && sp.is_primary === 1)
        );
        if (subIndex !== -1) {
          db.sub_profiles[subIndex].locked_course_id = cleanCourseId;
          db.sub_profiles[subIndex].status = 'Active';
        }
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
