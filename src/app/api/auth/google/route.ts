import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { signUserToken } from '@/lib/auth';
import { queryD1, executeD1 } from '@/lib/d1';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const lowerEmail = email.toLowerCase().trim();
    const cleanName = (name || lowerEmail.split('@')[0]).trim();

    // Check if user already exists
    let existingUser: any = null;

    // A. Check Cloudflare D1
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [lowerEmail]);
      if (d1Users && d1Users.length > 0) {
        const u = d1Users[0];
        existingUser = {
          id: u.id,
          name: u.name,
          email: u.email,
          status: u.status || 'Active',
          xp_total: u.xp_total || 0,
          locked_course_id: u.locked_course_id || null,
        };
      }
    } catch (e) {
      console.warn('[Google D1 Lookup Warning]:', e);
    }

    // B. Check Memory DB (shared-db.json)
    if (!existingUser) {
      try {
        const db = readSharedDb();
        if (db.users) {
          const memUser = db.users.find((u: any) => (u.email || '').toLowerCase().trim() === lowerEmail);
          if (memUser) {
            existingUser = {
              id: String(memUser._id || memUser.id),
              name: memUser.name,
              email: memUser.email,
              status: memUser.status || 'Active',
              xp_total: memUser.xp_total || 0,
              locked_course_id: memUser.locked_course_id || null,
            };
          }
        }
      } catch (_) {}
    }

    // Existing User handling
    if (existingUser) {
      const status = String(existingUser.status || '').toLowerCase();
      const isDeleted = status === 'deleted' || existingUser.name === 'Deleted User' || existingUser.email.startsWith('deleted_');
      const isSuspended = status === 'suspended';

      if (isDeleted) {
        return NextResponse.json({ error: 'This account has been deleted. Please create a new account.' }, { status: 401 });
      }
      if (isSuspended) {
        return NextResponse.json({ error: 'Your account is suspended. Please contact support to restore access.', isSuspended: true }, { status: 403 });
      }

      const token = signUserToken({
        userId: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        lockedCourseId: existingUser.locked_course_id || null,
      });

      const response = NextResponse.json({
        success: true,
        needsCourseSelection: !existingUser.locked_course_id,
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          lockedCourseId: existingUser.locked_course_id || null,
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

    // Brand New User -> Immediately register into Cloudflare D1 and SharedDb!
    const newUserId = generateId();
    const dummyPasswordHash = await bcrypt.hash(`google_oauth_${generateId()}_${Date.now()}`, 10);

    // 1. Insert into Cloudflare D1
    try {
      await executeD1(
        'INSERT INTO users (id, name, email, password_hash, status, xp_total, locked_course_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newUserId, cleanName, lowerEmail, dummyPasswordHash, 'Active', 0, null]
      );
    } catch (d1Err) {
      console.warn('[Google D1 User Insert Warning]:', d1Err);
    }

    // 2. Sync to SharedDb
    try {
      const db = readSharedDb();
      if (!db.users) db.users = [];
      db.users.push({
        _id: newUserId,
        id: newUserId,
        name: cleanName,
        email: lowerEmail,
        password_hash: dummyPasswordHash,
        status: 'Active',
        xp_total: 0,
        locked_course_id: null,
        created_at: new Date().toISOString(),
      });
      writeSharedDb(db);
    } catch (_) {}

    const token = signUserToken({
      userId: newUserId,
      email: lowerEmail,
      name: cleanName,
      lockedCourseId: null,
    });

    const response = NextResponse.json({
      success: true,
      needsCourseSelection: true,
      user: {
        id: newUserId,
        name: cleanName,
        email: lowerEmail,
        lockedCourseId: null,
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
