import { NextResponse } from 'next/server';
import { User } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1 } from '@/lib/d1';

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profileId } = await req.json();
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user: currentUser, isMemoryMode, isD1 } = authResult;

    // 1. Try D1 first
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE id = ? LIMIT 1', [profileId]);
      if (d1Users && d1Users.length > 0) {
        const targetProfile = d1Users[0];
        if (targetProfile.status === 'Deleted' || targetProfile.name === 'Deleted User') {
          return NextResponse.json({ error: 'Profile not found or deleted' }, { status: 404 });
        }

        const token = signUserToken({
          userId: targetProfile.id,
          email: targetProfile.email,
          name: targetProfile.name,
          lockedCourseId: targetProfile.locked_course_id || null,
        });

        const response = NextResponse.json({
          success: true,
          profile: {
            id: targetProfile.id,
            name: targetProfile.name,
            email: targetProfile.email,
            lockedCourseId: targetProfile.locked_course_id || null,
          },
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
    } catch (d1Err) {
      console.warn('[api/profile/switch] D1 fallback:', d1Err);
    }

    // 2. Memory Mode Fallback
    if (isMemoryMode) {
      const db = readSharedDb();
      const targetProfile = (db.users || []).find((u: any) => String(u._id) === String(profileId) || String(u.id) === String(profileId));
      if (!targetProfile || targetProfile.status === 'Deleted') {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      const token = signUserToken({
        userId: String(targetProfile._id || targetProfile.id),
        email: targetProfile.email,
        name: targetProfile.name,
        lockedCourseId: targetProfile.locked_course_id ? String(targetProfile.locked_course_id) : null,
      });

      const response = NextResponse.json({
        success: true,
        profile: {
          id: String(targetProfile._id || targetProfile.id),
          name: targetProfile.name,
          email: targetProfile.email,
          lockedCourseId: targetProfile.locked_course_id ? String(targetProfile.locked_course_id) : null,
        },
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

    // 3. Mongoose Mode (if not D1)
    if (!isD1) {
      let targetProfile = null;
      try {
        targetProfile = await User.findById(profileId);
      } catch (e) {
        targetProfile = await User.findOne({ _id: profileId });
      }

      if (!targetProfile || targetProfile.status === 'Deleted') {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      const token = signUserToken({
        userId: targetProfile._id.toString(),
        email: targetProfile.email,
        name: targetProfile.name,
        lockedCourseId: targetProfile.locked_course_id ? targetProfile.locked_course_id.toString() : null,
      });

      const response = NextResponse.json({
        success: true,
        profile: {
          id: targetProfile._id.toString(),
          name: targetProfile.name,
          email: targetProfile.email,
          lockedCourseId: targetProfile.locked_course_id ? targetProfile.locked_course_id.toString() : null,
        },
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

    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Profile switch failed' }, { status: 500 });
  }
}
