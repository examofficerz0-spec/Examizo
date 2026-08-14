import { NextResponse } from 'next/server';
import { User, Course } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const auth = getAuthenticatedUser();
  if (!auth) {
    const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    res.cookies.set('student_token', '', { httpOnly: true, maxAge: 0, path: '/' });
    return res;
  }

  try {
    const authResult = await getUserFromAuth(auth);
    if (
      !authResult ||
      !authResult.user ||
      authResult.user.status === 'Deleted' ||
      authResult.user.name === 'Deleted User' ||
      authResult.user.status === 'Suspended' ||
      authResult.user.status === 'suspended' ||
      authResult.user.status === 'SUSPENDED'
    ) {
      const res = NextResponse.json({ error: 'User deleted or suspended' }, { status: 401 });
      res.cookies.set('student_token', '', { httpOnly: true, maxAge: 0, path: '/' });
      return res;
    }

    const { user: currentUser, isMemoryMode } = authResult;

    // 1. Try D1 first
    try {
      const mainEmail = (currentUser.account_email || currentUser.email || auth.email).toLowerCase().trim();
      const d1Users = await queryD1(
        "SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(email) LIKE ? OR id = ?) AND status != 'Deleted' AND name != 'Deleted User' AND status != 'Suspended'",
        [mainEmail, `${mainEmail.split('@')[0]}+%`, String(currentUser._id || currentUser.id || auth.userId)]
      );

      if (d1Users && d1Users.length > 0) {
        const d1Courses = await queryD1('SELECT id, name FROM courses');
        const courseMap = new Map((d1Courses || []).map((c: any) => [c.id, c.name]));

        const currentIdStr = String(currentUser._id || currentUser.id || auth.userId);
        const profiles = d1Users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          accountEmail: mainEmail,
          lockedCourseId: u.locked_course_id || null,
          lockedCourseName: u.locked_course_id ? (courseMap.get(u.locked_course_id) || null) : null,
          isActive: u.id === currentIdStr,
          isPrimary: u.email.toLowerCase() === mainEmail,
          xp_total: u.xp_total || 0,
        }));

        return NextResponse.json({ success: true, profiles });
      }
    } catch (d1Err) {
      console.warn('[api/profile/list] D1 fallback:', d1Err);
    }

    // 2. Memory Mode Fallback
    if (isMemoryMode) {
      const db = readSharedDb();
      const mainEmail = (currentUser.account_email || currentUser.email).toLowerCase();

      const family = (db.users || []).filter(
        (u: any) =>
          u.status !== 'Deleted' &&
          u.name !== 'Deleted User' &&
          ((u.email && u.email.toLowerCase() === mainEmail) ||
           (u.account_email && u.account_email.toLowerCase() === mainEmail) ||
           (currentUser.email && currentUser.email.toLowerCase() === (u.account_email || '').toLowerCase()))
      );

      const profiles = family.map((u: any) => {
        const lockedCourse = (db.courses || []).find((c: any) => String(c._id) === String(u.locked_course_id)) || null;
        return {
          id: String(u._id),
          name: u.name,
          email: u.email,
          accountEmail: u.account_email || u.email,
          lockedCourseId: u.locked_course_id || null,
          lockedCourseName: lockedCourse?.name || null,
          isActive: String(u._id) === String(currentUser._id),
          isPrimary: u.email.toLowerCase() === mainEmail,
          xp_total: u.xp_total || 0,
        };
      });

      return NextResponse.json({ success: true, profiles });
    }

    // 3. Mongoose mode
    const mainEmail = (currentUser.account_email || currentUser.email).toLowerCase();

    const family = await User.find({
      $or: [
        { email: mainEmail },
        { account_email: mainEmail },
      ],
      status: { $ne: 'Deleted' },
      name: { $ne: 'Deleted User' },
    }).lean();

    const courses = await Course.find({ is_active: true }).lean();
    const courseMap = new Map(courses.map((c) => [c._id.toString(), c.name]));

    const profiles = family.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      accountEmail: u.account_email || u.email,
      lockedCourseId: u.locked_course_id ? u.locked_course_id.toString() : null,
      lockedCourseName: u.locked_course_id ? (courseMap.get(u.locked_course_id.toString()) || null) : null,
      isActive: u._id.toString() === currentUser._id.toString(),
      isPrimary: u.email.toLowerCase() === mainEmail,
      xp_total: u.xp_total || 0,
    }));

    return NextResponse.json({ success: true, profiles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list profiles' }, { status: 500 });
  }
}
