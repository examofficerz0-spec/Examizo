import { NextResponse } from 'next/server';
import { Course } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';

export async function GET() {
  const auth = getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const { user, isMemoryMode } = authResult;

    if (isMemoryMode) {
      const db = readSharedDb();
      const lockedCourse = (db.courses || []).find((c: any) => String(c._id) === String(user.locked_course_id)) || null;

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user._id ? String(user._id) : auth.userId,
          name: user.name,
          email: user.email,
          lockedCourse,
          xp_total: user.xp_total || 0,
          status: user.status,
        },
      });
    }

    // Mongoose Mode
    let lockedCourse = null;
    if (user.locked_course_id) {
      try {
        lockedCourse = await Course.findById(user.locked_course_id);
      } catch (e) {
        const db = readSharedDb();
        lockedCourse = (db.courses || []).find((c: any) => String(c._id) === String(user.locked_course_id)) || null;
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id ? user._id.toString() : auth.userId,
        name: user.name,
        email: user.email,
        lockedCourse,
        xp_total: user.xp_total || 0,
        status: user.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to authenticate' }, { status: 500 });
  }
}

