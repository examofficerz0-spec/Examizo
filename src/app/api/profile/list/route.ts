import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const auth = getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      const res = NextResponse.json({ error: 'User deleted or suspended', deleted: true }, { status: 401 });
      res.cookies.set('student_token', '', { maxAge: 0, path: '/', expires: new Date(0) });
      res.cookies.delete('student_token');
      return res;
    }

    const { user: currentUser } = authResult;
    const currentEmail = (currentUser.email || auth.email || '').toLowerCase().trim();
    const accountEmail = (currentUser.account_email || '').toLowerCase().trim();
    const baseHandle = (accountEmail || currentEmail).split('@')[0].split('+')[0].trim();

    // 1. Primary: Cloudflare D1
    try {
      const d1Users = await queryD1(
        "SELECT * FROM users WHERE (LOWER(email) LIKE ? OR LOWER(email) LIKE ? OR id = ?) AND status != 'Deleted' AND name != 'Deleted User' AND status != 'Suspended' AND status != 'suspended'",
        [`${baseHandle}@%`, `${baseHandle}+%`, String(currentUser._id || currentUser.id || auth.userId)]
      );

      if (d1Users && d1Users.length > 0) {
        const d1Courses = await queryD1('SELECT id, name FROM courses');
        const courseMap = new Map((d1Courses || []).map((c: any) => [c.id, c.name]));

        const currentIdStr = String(currentUser._id || currentUser.id || auth.userId);
        
        const sortedD1Users = [...d1Users].sort((a: any, b: any) => {
          const aIsPrimary = !a.email.includes('+');
          const bIsPrimary = !b.email.includes('+');
          if (aIsPrimary && !bIsPrimary) return -1;
          if (!aIsPrimary && bIsPrimary) return 1;
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });

        const validD1Users = sortedD1Users.filter((u: any) => {
          const isPrimary = !u.email.includes('+');
          return isPrimary || (u.locked_course_id && String(u.locked_course_id).trim().length > 0);
        });

        const profiles = validD1Users.map((u: any) => {
          const isPrimary = !u.email.includes('+');
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            accountEmail: `${baseHandle}@${(u.email.split('@')[1] || 'examizo.com')}`,
            lockedCourseId: u.locked_course_id || null,
            lockedCourseName: u.locked_course_id ? (courseMap.get(u.locked_course_id) || null) : null,
            isActive: u.id === currentIdStr,
            isPrimary,
            xp_total: u.xp_total || 0,
          };
        });

        return NextResponse.json({ success: true, profiles });
      }
    } catch (d1Err) {
      console.warn('[api/profile/list] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const family = (db.users || []).filter((u: any) => {
      if (u.status === 'Deleted' || u.name === 'Deleted User') return false;
      const uEmail = (u.email || '').toLowerCase().trim();
      const isPrimary = !uEmail.includes('+');
      if (!isPrimary && (!u.locked_course_id || !String(u.locked_course_id).trim())) {
        return false;
      }
      const uAcct = (u.account_email || '').toLowerCase().trim();
      const uHandle = (uAcct || uEmail).split('@')[0].split('+')[0].trim();
      return uHandle === baseHandle || String(u._id || u.id) === String(currentUser._id || currentUser.id);
    });

    const profiles = family.map((u: any) => {
      const lockedCourse = (db.courses || []).find((c: any) => String(c._id) === String(u.locked_course_id) || String(c.id) === String(u.locked_course_id)) || null;
      const isPrimary = !(u.email || '').includes('+');
      return {
        id: String(u._id || u.id),
        name: u.name,
        email: u.email,
        accountEmail: `${baseHandle}@${(u.email.split('@')[1] || 'examizo.com')}`,
        lockedCourseId: u.locked_course_id || null,
        lockedCourseName: lockedCourse?.name || null,
        isActive: String(u._id || u.id) === String(currentUser._id || currentUser.id),
        isPrimary,
        xp_total: u.xp_total || 0,
      };
    });

    if (!profiles || profiles.length === 0) {
      const defaultProfile = {
        id: String(currentUser._id || currentUser.id || auth.userId),
        name: currentUser.name || auth.name || 'Student',
        email: currentUser.email || auth.email,
        accountEmail: accountEmail || currentEmail,
        lockedCourseId: currentUser.locked_course_id || auth.lockedCourseId || null,
        lockedCourseName: null,
        isActive: true,
        isPrimary: true,
        xp_total: currentUser.xp_total || 0,
      };
      return NextResponse.json({ success: true, profiles: [defaultProfile] });
    }

    return NextResponse.json({ success: true, profiles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list profiles' }, { status: 500 });
  }
}
