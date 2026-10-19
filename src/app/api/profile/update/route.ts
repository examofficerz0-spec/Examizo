import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1, executeD1, ensureD1Tables } from '@/lib/d1';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized. Please login first.' }, { status: 401 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    const { user } = authResult;
    const userId = String(user._id || user.id || auth.userId);
    const body = await req.json();

    const nameInput = body.name || body.fullName || body.full_name;
    const nicknameInput = body.nickname !== undefined ? (body.nickname && String(body.nickname).trim() ? String(body.nickname).trim() : null) : undefined;
    const dobInput = body.dob ? String(body.dob).trim() : undefined;
    const passwordInput = body.password ? String(body.password).trim() : undefined;

    if (passwordInput && passwordInput.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 });
    }

    const cleanFullName = nameInput ? String(nameInput).trim() : (user.full_name || user.name);
    const cleanNickname = nicknameInput !== undefined ? nicknameInput : (user.nickname || null);
    const displayName = cleanNickname || cleanFullName;
    const cleanDob = dobInput !== undefined ? dobInput : (user.dob || null);

    let passwordHashToSave: string | null = null;
    if (passwordInput) {
      passwordHashToSave = await bcrypt.hash(passwordInput, 10);
    }

    await ensureD1Tables();

    // 1. Update Cloudflare D1
    try {
      if (passwordHashToSave) {
        await executeD1(
          'UPDATE users SET name = ?, full_name = ?, nickname = ?, dob = ?, password_hash = ?, raw_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR LOWER(email) = ?',
          [displayName, cleanFullName, cleanNickname, cleanDob, passwordHashToSave, passwordInput, userId, String(user.email || '').toLowerCase()]
        );
      } else {
        await executeD1(
          'UPDATE users SET name = ?, full_name = ?, nickname = ?, dob = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR LOWER(email) = ?',
          [displayName, cleanFullName, cleanNickname, cleanDob, userId, String(user.email || '').toLowerCase()]
        );
      }

      // Also update sub_profiles table if this is a sub-profile or primary profile
      executeD1(
        'UPDATE sub_profiles SET name = ?, full_name = ?, nickname = ?, dob = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [displayName, cleanFullName, cleanNickname, cleanDob, userId]
      ).catch(() => {});
    } catch (d1Err) {
      console.warn('[profile/update] D1 update warning:', d1Err);
    }

    // 2. Update Shared DB
    try {
      const db = readSharedDb();
      if (db && db.users) {
        const memUser = db.users.find(
          (u: any) => String(u._id) === userId || String(u.id) === userId || (u.email && u.email.toLowerCase() === String(user.email || '').toLowerCase())
        );
        if (memUser) {
          memUser.name = displayName;
          memUser.full_name = cleanFullName;
          memUser.nickname = cleanNickname;
          if (cleanDob) memUser.dob = cleanDob;
          if (passwordHashToSave) {
            memUser.password_hash = passwordHashToSave;
            memUser.raw_password = passwordInput;
          }
          writeSharedDb(db);
        }
      }
    } catch (_) {}

    // 3. Issue refreshed JWT Token
    const refreshedToken = signUserToken({
      userId,
      email: user.email,
      name: displayName,
      lockedCourseId: user.locked_course_id || auth.lockedCourseId || null,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: userId,
        name: displayName,
        fullName: cleanFullName,
        nickname: cleanNickname,
        dob: cleanDob,
        email: user.email,
        lockedCourseId: user.locked_course_id || null,
      },
    });

    response.cookies.set('student_token', refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
