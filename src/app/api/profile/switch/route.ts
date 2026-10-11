import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized. Please login first.' }, { status: 401 });
    }

    const { profileId, pin } = await req.json();
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Read sharedDb to cross-reference PINs
    const db = readSharedDb();
    const memTarget = (db.users || []).find(
      (u: any) => String(u._id) === String(profileId) || String(u.id) === String(profileId)
    );

    // 1. Primary: Cloudflare D1
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE id = ? LIMIT 1', [profileId]);
      if (d1Users && d1Users.length > 0) {
        const targetProfile = d1Users[0];
        if (targetProfile.status === 'Deleted' || targetProfile.name === 'Deleted User') {
          return NextResponse.json({ error: 'Profile not found or deleted' }, { status: 404 });
        }
        if (targetProfile.status === 'Suspended' || targetProfile.status === 'suspended' || targetProfile.status === 'SUSPENDED') {
          return NextResponse.json({ error: 'This sub-profile has been suspended by an administrator. Please select an active profile.' }, { status: 403 });
        }

        const expectedPin = targetProfile.pin || memTarget?.pin || null;
        if (expectedPin && String(expectedPin).trim().length === 4) {
          if (!pin) {
            return NextResponse.json({
              error: '4-digit PIN required to unlock this profile',
              requirePin: true,
              profileName: targetProfile.name,
            }, { status: 403 });
          }
          if (String(pin).trim() !== String(expectedPin).trim()) {
            return NextResponse.json({
              error: 'Incorrect 4-digit PIN. Please try again.',
              requirePin: true,
            }, { status: 403 });
          }
        }

        const resolvedCourseId = targetProfile.locked_course_id || memTarget?.locked_course_id || null;

        const token = signUserToken({
          userId: targetProfile.id,
          email: targetProfile.email,
          name: targetProfile.name,
          lockedCourseId: resolvedCourseId,
        });

        const response = NextResponse.json({
          success: true,
          profile: {
            id: targetProfile.id,
            name: targetProfile.name,
            email: targetProfile.email,
            lockedCourseId: resolvedCourseId,
          },
        });

        response.cookies.set('student_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
          sameSite: 'lax',
        });

        return response;
      }
    } catch (d1Err) {
      console.warn('[api/profile/switch] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    if (!memTarget || memTarget.status === 'Deleted') {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    if (memTarget.status === 'Suspended' || memTarget.status === 'suspended' || memTarget.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'This sub-profile has been suspended by an administrator. Please select an active profile.' }, { status: 403 });
    }

    const expectedPin = memTarget.pin || null;
    if (expectedPin && String(expectedPin).trim().length === 4) {
      if (!pin) {
        return NextResponse.json({
          error: '4-digit PIN required to unlock this profile',
          requirePin: true,
          profileName: memTarget.name,
        }, { status: 403 });
      }
      if (String(pin).trim() !== String(expectedPin).trim()) {
        return NextResponse.json({
          error: 'Incorrect 4-digit PIN. Please try again.',
          requirePin: true,
        }, { status: 403 });
      }
    }

    const resolvedCourseId = memTarget.locked_course_id ? String(memTarget.locked_course_id) : null;

    const token = signUserToken({
      userId: String(memTarget._id || memTarget.id),
      email: memTarget.email,
      name: memTarget.name,
      lockedCourseId: resolvedCourseId,
    });

    const response = NextResponse.json({
      success: true,
      profile: {
        id: String(memTarget._id || memTarget.id),
        name: memTarget.name,
        email: memTarget.email,
        lockedCourseId: resolvedCourseId,
      },
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
    return NextResponse.json({ error: error.message || 'Profile switch failed' }, { status: 500 });
  }
}
