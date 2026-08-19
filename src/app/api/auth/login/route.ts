import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { signUserToken } from '@/lib/auth';
import { queryD1, executeD1 } from '@/lib/d1';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();

    // 1. Try Cloudflare D1 lookup first
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [lowerEmail]);
      if (d1Users && d1Users.length > 0) {
        const u = d1Users[0];
        const isSuspended = u.status === 'Suspended' || u.status === 'suspended' || u.status === 'SUSPENDED';
        const isDeleted = u.status === 'Deleted' || u.name === 'Deleted User' || (u.email && u.email.startsWith('deleted_'));
        
        if (isDeleted) {
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }
        if (isSuspended) {
          return NextResponse.json({ error: 'Your account is suspended. Please contact support to restore access.', isSuspended: true }, { status: 403 });
        }

        let isMatch = false;
        try {
          isMatch = await bcrypt.compare(password, u.password_hash);
        } catch (e) {}

        if (!isMatch && u.password_hash === password) {
          isMatch = true;
          const newHash = await bcrypt.hash(password, 10);
          await executeD1('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, u.id]);
        }

        if (!isMatch) {
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const token = signUserToken({
          userId: u.id,
          email: u.email,
          name: u.name,
          lockedCourseId: u.locked_course_id || null,
        });

        const response = NextResponse.json({
          success: true,
          user: { id: u.id, name: u.name, email: u.email, lockedCourseId: u.locked_course_id || null },
        });

        response.cookies.set('student_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });

        return response;
      }
    } catch (e) {
      console.warn('[Login D1 Warning]:', e);
    }

    // 2. Memory / Shared DB Fallback
    const db = readSharedDb();
    const user = (db.users || []).find((u) => (u.email || '').toLowerCase().trim() === lowerEmail);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isSuspended = user.status === 'Suspended' || user.status === 'suspended' || user.status === 'SUSPENDED';
    const isDeleted = user.status === 'Deleted' || user.name === 'Deleted User' || (user.email && user.email.startsWith('deleted_'));

    if (isDeleted) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    if (isSuspended) {
      return NextResponse.json({ error: 'Your account is suspended. Please contact support to restore access.', isSuspended: true }, { status: 403 });
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } catch (e) {}

    if (!isMatch && user.password_hash === password) {
      isMatch = true;
      user.password_hash = await bcrypt.hash(password, 10);
      writeSharedDb(db);
    }

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = signUserToken({
      userId: user._id || user.id,
      email: user.email,
      name: user.name,
      lockedCourseId: user.locked_course_id || null,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user._id || user.id, name: user.name, email: user.email, lockedCourseId: user.locked_course_id || null },
    });

    response.cookies.set('student_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
