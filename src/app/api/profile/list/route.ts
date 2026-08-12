import { NextResponse } from 'next/server';
import { User, Course } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';

export async function GET() {
  const auth = getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user: currentUser, isMemoryMode } = authResult;

    if (isMemoryMode) {
      const db = readSharedDb();
      const mainEmail = (currentUser.account_email || currentUser.email).toLowerCase();

      // Find all profiles matching this main account email
      const family = (db.users || []).filter(
        (u: any) =>
          (u.email && u.email.toLowerCase() === mainEmail) ||
          (u.account_email && u.account_email.toLowerCase() === mainEmail) ||
          (currentUser.email && currentUser.email.toLowerCase() === (u.account_email || '').toLowerCase())
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

    // Mongoose mode
    const mainEmail = (currentUser.account_email || currentUser.email).toLowerCase();

    const family = await User.find({
      $or: [
        { email: mainEmail },
        { account_email: mainEmail },
      ],
      status: { $ne: 'Deleted' },
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

