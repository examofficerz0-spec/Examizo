import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { signUserToken } from '@/lib/auth';
import { queryD1, executeD1, ensureD1Tables } from '@/lib/d1';
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

    const body = await req.json();
    const fullName = body.fullName || body.full_name || body.name;
    const nickname = body.nickname ? String(body.nickname).trim() : null;
    const dob = body.dob || body.dateOfBirth || body.date_of_birth;
    const email = body.email;
    const password = body.password;
    const confirmPassword = body.confirmPassword;
    const courseId = body.courseId || body.course_id;
    const courseData = body.courseData;

    if (!fullName || !String(fullName).trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    if (!dob || !String(dob).trim()) {
      return NextResponse.json({ error: 'Date of birth (DOB) is required' }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    const cleanFullName = String(fullName).trim();
    const cleanNickname = nickname && nickname.trim() ? nickname.trim() : null;
    const cleanDob = String(dob).trim();
    const displayName = cleanNickname || cleanFullName;
    const lowerEmail = String(email).toLowerCase().trim();
    const targetCourseId = courseId ? String(courseId).trim() : null;
    const cleanCourseId = targetCourseId || null;
    const newUserId = generateId();
    const password_hash = await bcrypt.hash(password, 10);

    // Auto-create / persist course if new curriculum track metadata is passed
    if (courseData && courseData.courseName && cleanCourseId) {
      try {
        const existingD1Courses = await queryD1(
          'SELECT id FROM courses WHERE id = ? OR name = ?',
          [cleanCourseId, String(courseData.courseName).trim()]
        );
        if (!existingD1Courses || existingD1Courses.length === 0) {
          await executeD1(
            `INSERT OR IGNORE INTO courses (id, name, description, category, board, curriculum, subjects_json, marks_per_correct, penalty_per_incorrect, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 4.0, 1.0, 1, ?)`,
            [
              cleanCourseId,
              String(courseData.courseName).trim(),
              `${courseData.courseName} preparation and assessment curriculum`,
              courseData.category === 'School Exams' ? 'School Exams' : 'Competitive Exams',
              courseData.board || 'CBSE',
              courseData.classGrade || courseData.examName || '',
              JSON.stringify(courseData.subjects || []),
              new Date().toISOString(),
            ]
          );
        }
      } catch (cErr) {
        console.warn('[Register D1 auto-create course warning]:', cErr);
      }

      // Mirror to sharedDb
      try {
        const sDb = readSharedDb();
        if (sDb && Array.isArray(sDb.courses)) {
          const exists = sDb.courses.some(
            (c: any) => String(c.id) === cleanCourseId || String(c._id) === cleanCourseId || c.name === courseData.courseName
          );
          if (!exists) {
            sDb.courses.push({
              _id: cleanCourseId,
              id: cleanCourseId,
              name: String(courseData.courseName).trim(),
              description: `${courseData.courseName} preparation and assessment curriculum`,
              category: courseData.category === 'School Exams' ? 'School Exams' : 'Competitive Exams',
              board: courseData.board || 'CBSE',
              curriculum: courseData.classGrade || courseData.examName || '',
              subjects: Array.isArray(courseData.subjects) ? courseData.subjects : [],
              marks_per_correct: 4.0,
              penalty_per_incorrect: 1.0,
              is_active: true,
              created_at: new Date().toISOString(),
            });
            writeSharedDb(sDb);
          }
        }
      } catch (_) {}
    }

    // 1. Try Cloudflare D1 registration
    try {
      await ensureD1Tables();
      const existing = await queryD1('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [lowerEmail]);
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }

      const d1Success = await executeD1(
        'INSERT OR REPLACE INTO users (id, name, full_name, nickname, dob, email, account_email, password_hash, raw_password, status, xp_total, locked_course_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newUserId, cleanFullName, cleanFullName, cleanNickname, cleanDob, lowerEmail, lowerEmail, password_hash, password, 'Active', 0, cleanCourseId]
      );

      if (d1Success) {
        // Also ensure primary profile in sub_profiles
        try {
          await executeD1(
            `INSERT OR REPLACE INTO sub_profiles (
              id, parent_user_id, parent_email, name, full_name, nickname, dob, pin, avatar_color, locked_course_id, xp_total, status, is_primary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'bg-blue-600', ?, 0, 'Active', 1)`,
            [newUserId, newUserId, lowerEmail, displayName, cleanFullName, cleanNickname, cleanDob, cleanCourseId]
          );
        } catch (subErr) {
          console.warn('[Register SubProfile D1 Warning]:', subErr);
        }

        // Also sync memory store
        try {
          const db = readSharedDb();
          if (!db.users) db.users = [];
          db.users.push({
            _id: newUserId,
            id: newUserId,
            name: cleanFullName,
            full_name: cleanFullName,
            nickname: cleanNickname,
            dob: cleanDob,
            email: lowerEmail,
            account_email: lowerEmail,
            password_hash,
            status: 'Active',
            xp_total: 0,
            locked_course_id: cleanCourseId,
            created_at: new Date().toISOString(),
          });
          if (!db.sub_profiles) db.sub_profiles = [];
          db.sub_profiles.push({
            id: newUserId,
            _id: newUserId,
            parent_user_id: newUserId,
            parent_email: lowerEmail,
            name: displayName,
            full_name: cleanFullName,
            nickname: cleanNickname,
            dob: cleanDob,
            pin: null,
            avatar_color: 'bg-blue-600',
            locked_course_id: cleanCourseId,
            xp_total: 0,
            status: 'Active',
            is_primary: 1,
            created_at: new Date().toISOString(),
          });
          writeSharedDb(db);
        } catch (_) {}

        const token = signUserToken({
          userId: newUserId,
          email: lowerEmail,
          name: displayName,
          lockedCourseId: cleanCourseId,
        });

        const response = NextResponse.json({
          success: true,
          user: {
            id: newUserId,
            name: displayName,
            fullName: cleanFullName,
            nickname: cleanNickname,
            dob: cleanDob,
            email: lowerEmail,
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
      name: cleanFullName,
      full_name: cleanFullName,
      nickname: cleanNickname,
      dob: cleanDob,
      email: lowerEmail,
      account_email: lowerEmail,
      password_hash,
      status: 'Active',
      xp_total: 0,
      locked_course_id: cleanCourseId,
      created_at: new Date().toISOString(),
    };

    if (!db.users) db.users = [];
    db.users.push(newUser);
    if (!db.sub_profiles) db.sub_profiles = [];
    db.sub_profiles.push({
      id: newUserId,
      _id: newUserId,
      parent_user_id: newUserId,
      parent_email: lowerEmail,
      name: displayName,
      full_name: cleanFullName,
      nickname: cleanNickname,
      dob: cleanDob,
      pin: null,
      avatar_color: 'bg-blue-600',
      locked_course_id: cleanCourseId,
      xp_total: 0,
      status: 'Active',
      is_primary: 1,
      created_at: new Date().toISOString(),
    });
    writeSharedDb(db);

    const token = signUserToken({
      userId: newUser._id,
      email: newUser.email,
      name: displayName,
      lockedCourseId: cleanCourseId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser._id,
        name: displayName,
        fullName: cleanFullName,
        nickname: cleanNickname,
        dob: cleanDob,
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
