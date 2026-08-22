import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1 } from '@/lib/d1';

export async function GET() {
  const auth = getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ authenticated: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const authResult = await getUserFromAuth(auth);
    if (
      authResult?.user &&
      (authResult.user.status === 'Deleted' ||
      authResult.user.name === 'Deleted User' ||
      authResult.user.status === 'Suspended' ||
      authResult.user.status === 'suspended' ||
      authResult.user.status === 'SUSPENDED')
    ) {
      return NextResponse.json({ authenticated: false, error: 'User deleted or suspended' }, { status: 401 });
    }

    if (!authResult || !authResult.user) {
      // Pending onboarding student who has not chosen a course yet
      return NextResponse.json({
        authenticated: true,
        user: {
          id: auth.userId,
          name: auth.name || auth.email?.split('@')[0] || 'Student',
          email: auth.email,
          lockedCourse: null,
          lockedCourseId: null,
          xp_total: 0,
          status: 'Active',
        },
      });
    }

    const { user } = authResult;

    let lockedCourse: any = null;
    const rawCourseId = user.locked_course_id || auth.lockedCourseId;

    if (rawCourseId) {
      const courseIdStr = String(typeof rawCourseId === 'object' ? (rawCourseId._id || rawCourseId.id) : rawCourseId);

      // 1. Try Cloudflare D1
      try {
        const d1Courses = await queryD1('SELECT * FROM courses WHERE id = ? LIMIT 1', [courseIdStr]);
        if (d1Courses && d1Courses.length > 0) {
          const c = d1Courses[0];
          let subjects = [];
          try {
            subjects = typeof c.subjects_json === 'string' ? JSON.parse(c.subjects_json) : (c.subjects_json || []);
          } catch (e) {
            subjects = ['Physics', 'Chemistry', 'Mathematics'];
          }
          lockedCourse = {
            _id: c.id,
            id: c.id,
            name: c.name,
            description: c.description,
            category: c.category,
            board: c.board,
            curriculum: c.curriculum,
            subjects,
            is_active: c.is_active !== 0,
          };
        }
      } catch (e) {
        console.warn('[auth/me] D1 course lookup warning:', e);
      }

      // 2. Memory Mode fallback
      if (!lockedCourse) {
        const db = readSharedDb();
        lockedCourse = (db.courses || []).find((c: any) => String(c._id) === courseIdStr || String(c.id) === courseIdStr) || null;
      }

      // Default course object if not found in db
      if (!lockedCourse) {
        lockedCourse = {
          _id: courseIdStr,
          id: courseIdStr,
          name: 'Enrolled Course',
          category: 'Course Track',
        };
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id ? String(user._id) : auth.userId,
        name: user.name,
        email: user.email,
        lockedCourse,
        lockedCourseId: rawCourseId ? String(rawCourseId) : null,
        xp_total: user.xp_total || 0,
        status: user.status,
      },
    });
  } catch (error: any) {
    const res = NextResponse.json({ error: error.message || 'Failed to authenticate' }, { status: 500 });
    return res;
  }
}
