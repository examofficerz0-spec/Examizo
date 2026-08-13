import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User } from '@/lib/models';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { signUserToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();

    if (isMemoryMode) {
      const db = readSharedDb();
      const user = db.users.find((u) => u.email.toLowerCase() === lowerEmail);
      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      if (user.status === 'Suspended') {
        return NextResponse.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 });
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
        userId: user._id,
        email: user.email,
        name: user.name,
        lockedCourseId: user.locked_course_id || null,
      });

      const response = NextResponse.json({
        success: true,
        user: { id: user._id, name: user.name, email: user.email, lockedCourseId: user.locked_course_id },
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

    // Mongoose / Atlas mode
    const user = await User.findOne({ email: lowerEmail });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.status === 'Suspended') {
      return NextResponse.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 });
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } catch (e) {}

    if (!isMatch && user.password_hash === password) {
      isMatch = true;
      user.password_hash = await bcrypt.hash(password, 10);
      await user.save();
    }

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
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
