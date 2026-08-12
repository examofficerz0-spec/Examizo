import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: 'Course selection is required' }, { status: 400 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user, isMemoryMode } = authResult;

    if (user.locked_course_id) {
      return NextResponse.json(
        { error: 'RULE-01 Violation: Your course selection is permanently locked and cannot be changed.' },
        { status: 403 }
      );
    }

    if (isMemoryMode) {
      const db = readSharedDb();
      const dbUser = (db.users || []).find((u: any) => String(u._id) === String(user._id) || String(u.email).toLowerCase() === String(user.email).toLowerCase());
      if (dbUser) {
        dbUser.locked_course_id = courseId;
        writeSharedDb(db);
      } else {
        user.locked_course_id = courseId;
      }
    } else {
      user.locked_course_id = courseId;
      await user.save();
    }

    const resolvedUserId = user._id ? user._id.toString() : auth.userId;

    const newToken = signUserToken({
      userId: resolvedUserId,
      email: user.email,
      name: user.name,
      lockedCourseId: courseId,
    });

    const response = NextResponse.json({ success: true, lockedCourseId: courseId });
    response.cookies.set('student_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
  }
}

