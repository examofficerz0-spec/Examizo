import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { signUserToken } from '@/lib/auth';
import { queryD1, executeD1 } from '@/lib/d1';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`register_${clientIp}`, 5, 120000); // 5 registrations per 2 minutes

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) },
        }
      );
    }

    const { name, email, password, confirmPassword, courseId, course_id } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const targetCourseId = courseId || course_id ? String(courseId || course_id).trim() : null;

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const cleanCourseId = targetCourseId || null;
    const newUserId = generateId();
    const password_hash = await bcrypt.hash(password, 10);

    // 1. Try Cloudflare D1 registration
    try {
      const existing = await queryD1('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [lowerEmail]);
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }

      const d1Success = await executeD1(
        'INSERT INTO users (id, name, email, password_hash, status, xp_total, locked_course_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newUserId, name, lowerEmail, password_hash, 'Active', 0, cleanCourseId]
      );

      if (d1Success) {
        // Also sync memory store
        try {
          const db = readSharedDb();
          if (!db.users) db.users = [];
          db.users.push({
            _id: newUserId,
            id: newUserId,
            name,
            email: lowerEmail,
            password_hash,
            status: 'Active',
            xp_total: 0,
            locked_course_id: cleanCourseId,
            created_at: new Date().toISOString(),
          });
          writeSharedDb(db);
        } catch (_) {}

        const token = signUserToken({
          userId: newUserId,
          email: lowerEmail,
          name,
          lockedCourseId: cleanCourseId,
        });

        const response = NextResponse.json({
          success: true,
          user: { id: newUserId, name, email: lowerEmail, lockedCourseId: cleanCourseId },
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
      console.warn('[Register D1 Warning]:', e);
    }

    // 2. Memory DB fallback
    const db = readSharedDb();
    const existing = (db.users || []).find((u) => u.email.toLowerCase() === lowerEmail);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const newUser = {
      _id: newUserId,
      id: newUserId,
      name,
      email: lowerEmail,
      password_hash,
      status: 'Active',
      xp_total: 0,
      locked_course_id: cleanCourseId,
      created_at: new Date().toISOString(),
    };

    if (!db.users) db.users = [];
    db.users.push(newUser);
    writeSharedDb(db);

    const token = signUserToken({
      userId: newUser._id,
      email: newUser.email,
      name: newUser.name,
      lockedCourseId: cleanCourseId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        lockedCourseId: cleanCourseId,
      },
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
