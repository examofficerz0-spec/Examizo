import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { signUserToken } from '@/lib/auth';
import { queryD1 } from '@/lib/d1';

function parseJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    
    if (typeof Buffer !== 'undefined') {
      const json = Buffer.from(padded, 'base64').toString('utf-8');
      return JSON.parse(json);
    }
    const jsonPayload = decodeURIComponent(
      atob(padded)
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

    // 1. If access_token was supplied, verify and fetch user info server-side
    if (body.access_token || body.accessToken) {
      const at = body.access_token || body.accessToken;
      try {
        const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${at}` },
        });
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.email) {
            email = gData.email;
            name = gData.name || email.split('@')[0];
          }
        }
      } catch (err) {
        console.warn('Failed to verify access_token with Google:', err);
      }
    }

    // 2. If credential (ID Token JWT) was supplied, parse payload
    if (body.credential) {
      const payload = parseJwtPayload(body.credential);
      if (payload && payload.email) {
        email = payload.email;
        name = payload.name || payload.email.split('@')[0];
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Unable to retrieve email from Google authentication.' }, { status: 400 });
    }

    email = email.toLowerCase().trim();
    name = name || email.split('@')[0];

    // 1. Try Cloudflare D1 Google Auth
    try {
      const existing = await queryD1('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
      let user: any = existing && existing.length > 0 ? existing[0] : null;

      // If user does not exist in DB yet, DO NOT insert into DB!
      // They will ONLY be registered into the DB when they choose a course on /course-selection.
      if (!user) {
        const pendingUserId = generateId();
        const token = signUserToken({
          userId: pendingUserId,
          email,
          name,
          lockedCourseId: null,
        });

        const response = NextResponse.json({
          success: true,
          needsCourseSelection: true,
          user: {
            id: pendingUserId,
            name,
            email,
            lockedCourseId: null,
          },
        });

        response.cookies.set({
          name: 'student_token',
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });

        return response;
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
          lockedCourseId: user.locked_course_id || null,
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
        // Do not insert into DB yet - pending course selection
        const pendingUserId = generateId();
        const token = signUserToken({
          userId: pendingUserId,
          email,
          name,
          lockedCourseId: null,
        });

        const response = NextResponse.json({
          success: true,
          needsCourseSelection: true,
          user: {
            id: pendingUserId,
            name,
            email,
            lockedCourseId: null,
          },
        });

        response.cookies.set({
          name: 'student_token',
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });

        return response;
      }

      const token = signUserToken({
        userId: String(user._id),
        email: user.email,
        name: user.name,
        lockedCourseId: user.locked_course_id || null,
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
      // Pending course selection - do not create record yet
      const pendingUserId = generateId();
      const token = signUserToken({
        userId: pendingUserId,
        email,
        name,
        lockedCourseId: null,
      });

      const response = NextResponse.json({
        success: true,
        needsCourseSelection: true,
        user: {
          id: pendingUserId,
          name,
          email,
          lockedCourseId: null,
        },
      });

      response.cookies.set({
        name: 'student_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    const token = signUserToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      lockedCourseId: user.locked_course_id ? user.locked_course_id.toString() : null,
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
