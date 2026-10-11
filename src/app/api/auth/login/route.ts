import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { signUserToken } from '@/lib/auth';
import { queryD1, executeD1, ensureD1Tables } from '@/lib/d1';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`login_${clientIp}`, 6, 60000);

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) },
        }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();

    // Read sharedDb upfront for cross-referencing and resilience
    const db = readSharedDb();
    const memUser = (db.users || []).find(
      (mu) =>
        (mu.email || '').toLowerCase().trim() === lowerEmail ||
        (mu.account_email || '').toLowerCase().trim() === lowerEmail
    );

    // 1. Try Cloudflare D1 lookup first
    try {
      await ensureD1Tables();
      const d1Users = await queryD1('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(account_email) = ? LIMIT 1', [lowerEmail, lowerEmail]);
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
        if (u.password_hash) {
          try {
            isMatch = await bcrypt.compare(password, u.password_hash);
          } catch (e) {}
        }

        // Also allow matching if memUser has password_hash
        if (!isMatch && memUser?.password_hash) {
          try {
            isMatch = await bcrypt.compare(password, memUser.password_hash);
          } catch (e) {}
        }

        if (!isMatch) {
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Cross-sync locked course between D1 and sharedDb
        const resolvedCourseId = u.locked_course_id || memUser?.locked_course_id || null;

        if (resolvedCourseId && !u.locked_course_id) {
          executeD1('UPDATE users SET locked_course_id = ?, status = ? WHERE id = ?', [resolvedCourseId, 'Active', u.id]).catch(() => {});
        }

        if (resolvedCourseId && memUser && !memUser.locked_course_id) {
          memUser.locked_course_id = resolvedCourseId;
          writeSharedDb(db);
        } else if (!memUser && db.users) {
          db.users.push({
            _id: u.id,
            id: u.id,
            name: u.name,
            email: u.email,
            password_hash: u.password_hash,
            status: u.status || 'Active',
            xp_total: u.xp_total || 0,
            locked_course_id: resolvedCourseId,
            created_at: u.created_at || new Date().toISOString(),
          });
          writeSharedDb(db);
        }

        const token = signUserToken({
          userId: u.id,
          email: u.email,
          name: u.name,
          lockedCourseId: resolvedCourseId,
        });

        const response = NextResponse.json({
          success: true,
          user: { id: u.id, name: u.name, email: u.email, lockedCourseId: resolvedCourseId },
        });

        response.cookies.set('student_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });

        return response;
      }
    } catch (e) {
      console.warn('[Login D1 Warning]:', e);
    }

    // 2. Memory / Shared DB Fallback
    if (!memUser) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isSuspended = memUser.status === 'Suspended' || memUser.status === 'suspended' || memUser.status === 'SUSPENDED';
    const isDeleted = memUser.status === 'Deleted' || memUser.name === 'Deleted User' || (memUser.email && memUser.email.startsWith('deleted_'));

    if (isDeleted) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    if (isSuspended) {
      return NextResponse.json({ error: 'Your account is suspended. Please contact support to restore access.', isSuspended: true }, { status: 403 });
    }

    let isMatch = false;
    if (memUser.password_hash) {
      try {
        isMatch = await bcrypt.compare(password, memUser.password_hash);
      } catch (e) {}
    }

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const resolvedCourseId = memUser.locked_course_id || null;
    const userId = String(memUser._id || memUser.id);

    // Asynchronously ensure D1 has the record
    executeD1(
      'INSERT OR IGNORE INTO users (id, name, email, password_hash, status, xp_total, locked_course_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, memUser.name, memUser.email, memUser.password_hash, 'Active', memUser.xp_total || 0, resolvedCourseId]
    ).catch(() => {});

    const token = signUserToken({
      userId,
      email: memUser.email,
      name: memUser.name,
      lockedCourseId: resolvedCourseId,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: userId, name: memUser.name, email: memUser.email, lockedCourseId: resolvedCourseId },
    });

    response.cookies.set('student_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
