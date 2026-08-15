import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { signUserToken } from '@/lib/auth';
import { queryD1, executeD1 } from '@/lib/d1';

function parseJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let email = body.email;
    let name = body.name;

    if (body.credential) {
      const payload = parseJwtPayload(body.credential);
      if (payload && payload.email) {
        email = payload.email;
        name = payload.name || payload.email.split('@')[0];
      }
    }

    email = (email || 'student.google@exammaster.com').toLowerCase();
    name = name || email.split('@')[0];

    // 1. Try Cloudflare D1 Google Auth
    try {
      const existing = await queryD1('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
      let user: any = existing && existing.length > 0 ? existing[0] : null;

      if (!user) {
        const userId = generateId();
        const created = await executeD1(
          'INSERT INTO users (id, name, email, password_hash, status, xp_total, locked_course_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, name, email, 'google_oauth_authenticated', 'Active', 0, null]
        );

        if (created) {
          user = { id: userId, name, email, locked_course_id: null, xp_total: 0 };
        }
      }

      if (user) {
        const isSuspended = user.status === 'Suspended' || user.status === 'suspended' || user.status === 'SUSPENDED';
        const isDeleted = user.status === 'Deleted' || user.name === 'Deleted User' || (user.email && user.email.startsWith('deleted_'));

        if (isDeleted) {
          return NextResponse.json({ error: 'This account has been deleted. Please create a new account.' }, { status: 401 });
        }
        if (isSuspended) {
          return NextResponse.json({ error: 'Your account is suspended. Please contact support to restore access.', isSuspended: true }, { status: 403 });
        }

        const token = signUserToken({
          userId: user.id,
          email: user.email,
          name: user.name,
        });

        const response = NextResponse.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            lockedCourseId: user.locked_course_id || null,
          },
        });

        response.cookies.set({
          name: 'student_token',
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });

        return response;
      }
    } catch (e) {
      console.warn('[Google D1 Warning]:', e);
    }

    // 2. Memory Mode Fallback
    const { isMemoryMode } = await dbConnect();

    if (isMemoryMode) {
      const db = readSharedDb();
      if (!db.users) db.users = [];

      let user = db.users.find((u) => u.email?.toLowerCase() === email);

      if (user) {
        const isSuspended = user.status === 'Suspended' || user.status === 'suspended' || user.status === 'SUSPENDED';
        const isDeleted = user.status === 'Deleted' || user.name === 'Deleted User' || (user.email && user.email.startsWith('deleted_'));
        if (isDeleted) {
          return NextResponse.json({ error: 'This account has been deleted. Please create a new account.' }, { status: 401 });
        }
        if (isSuspended) {
          return NextResponse.json({ error: 'Your account is suspended. Please contact support to restore access.', isSuspended: true }, { status: 403 });
        }
      } else {
        user = {
          _id: generateId(),
          name,
          email,
          password_hash: 'google_oauth_authenticated',
          locked_course_id: null,
          role: 'student',
          status: 'Active',
          xp_total: 0,
          rank: 1,
          created_at: new Date().toISOString(),
        };
        db.users.push(user);
        writeSharedDb(db);
      }

      const token = signUserToken({
        userId: String(user._id),
        email: user.email,
        name: user.name,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          lockedCourseId: user.locked_course_id,
        },
      });

      response.cookies.set({
        name: 'student_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    // 3. Mongoose Mode Fallback
    let user = await User.findOne({ email });

    if (user) {
      const userStatus = String(user.status || '').toLowerCase();
      const isSuspended = userStatus === 'suspended';
      const isDeleted = userStatus === 'deleted' || user.name === 'Deleted User' || (user.email && user.email.startsWith('deleted_'));
      if (isDeleted) {
        return NextResponse.json({ error: 'This account has been deleted. Please create a new account.' }, { status: 401 });
      }
      if (isSuspended) {
        return NextResponse.json({ error: 'Your account is suspended. Please contact support to restore access.', isSuspended: true }, { status: 403 });
      }
    } else {
      user = await User.create({
        name,
        email,
        password_hash: 'google_oauth_authenticated',
        role: 'student',
        status: 'Active',
        xp_total: 0,
      });
    }

    const token = signUserToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        lockedCourseId: user.locked_course_id ? user.locked_course_id.toString() : null,
      },
    });

    response.cookies.set({
      name: 'student_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Google authentication failed' }, { status: 500 });
  }
}
