import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { signUserToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const { name, email, password, confirmPassword } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters with at least one letter and one number' }, { status: 400 });
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();

    if (isMemoryMode) {
      const db = readSharedDb();
      const existing = db.users.find((u) => u.email.toLowerCase() === lowerEmail);
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const newUserId = generateId();
      const newUser = {
        _id: newUserId,
        name,
        email: lowerEmail,
        password_hash,
        status: 'Active',
        xp_total: 0,
        locked_course_id: null,
        created_at: new Date().toISOString(),
      };

      db.users.push(newUser);
      writeSharedDb(db);

      const token = signUserToken({
        userId: newUser._id,
        email: newUser.email,
        name: newUser.name,
        lockedCourseId: null,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          lockedCourseId: null,
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

    // Atlas Mongoose mode
    const existing = await User.findOne({ email: lowerEmail });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email: lowerEmail,
      password_hash,
      status: 'Active',
      xp_total: 0,
      locked_course_id: null,
    });

    const token = signUserToken({
      userId: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      lockedCourseId: null,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        lockedCourseId: null,
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
