import { NextResponse } from 'next/server';
import { User } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
    }

    const cleanName = name.trim();
    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user: currentUser, isMemoryMode } = authResult;

    if (isMemoryMode) {
      const db = readSharedDb();
      const mainEmail = (currentUser.account_email || currentUser.email).toLowerCase();

      // Check max profiles (limit 4 per account)
      const existingProfiles = (db.users || []).filter(
        (u: any) =>
          (u.email && u.email.toLowerCase() === mainEmail) ||
          (u.account_email && u.account_email.toLowerCase() === mainEmail)
      );

      if (existingProfiles.length >= 4) {
        return NextResponse.json(
          { error: 'Maximum 4 profiles per account reached. Delete a profile to create a new one.' },
          { status: 400 }
        );
      }

      // Generate a unique virtual profile email linked to parent account
      const profileEmail = `${mainEmail.split('@')[0]}+profile_${Date.now() % 10000}@exammaster.internal`;

      const newProfile = {
        _id: generateId(),
        name: cleanName,
        email: profileEmail,
        password_hash: currentUser.password_hash || 'profile_nopass',
        account_email: mainEmail,
        locked_course_id: null, // NEW PROFILE HAS NO COURSE LOCKED YET!
        status: 'Active',
        xp_total: 0,
        created_at: new Date().toISOString(),
      };

      // Also ensure parent user has account_email set
      if (!currentUser.account_email) {
        currentUser.account_email = mainEmail;
      }

      db.users.push(newProfile);
      writeSharedDb(db);

      // Sign JWT token for the newly created profile
      const token = signUserToken({
        userId: String(newProfile._id),
        email: newProfile.email,
        name: newProfile.name,
        lockedCourseId: null,
      });

      const response = NextResponse.json({
        success: true,
        profile: {
          id: String(newProfile._id),
          name: newProfile.name,
          email: newProfile.email,
          lockedCourseId: null,
        },
        needsCourseSelection: true,
      });

      response.cookies.set('student_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    // Mongoose Mode
    const mainEmail = (currentUser.account_email || currentUser.email).toLowerCase();

    const existingCount = await User.countDocuments({
      $or: [
        { email: mainEmail },
        { account_email: mainEmail },
      ],
      status: { $ne: 'Deleted' },
    });

    if (existingCount >= 4) {
      return NextResponse.json(
        { error: 'Maximum 4 profiles per account reached. Delete a profile to create a new one.' },
        { status: 400 }
      );
    }

    if (!currentUser.account_email) {
      currentUser.account_email = mainEmail;
      await currentUser.save();
    }

    const profileEmail = `${mainEmail.split('@')[0]}+profile_${Date.now() % 10000}@exammaster.internal`;

    const newProfile = await User.create({
      name: cleanName,
      email: profileEmail,
      password_hash: currentUser.password_hash,
      account_email: mainEmail,
      locked_course_id: null, // NEW PROFILE HAS NO COURSE LOCKED YET!
      status: 'Active',
      xp_total: 0,
    });

    const token = signUserToken({
      userId: newProfile._id.toString(),
      email: newProfile.email,
      name: newProfile.name,
      lockedCourseId: null,
    });

    const response = NextResponse.json({
      success: true,
      profile: {
        id: newProfile._id.toString(),
        name: newProfile.name,
        email: newProfile.email,
        lockedCourseId: null,
      },
      needsCourseSelection: true,
    });

    response.cookies.set('student_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create profile' }, { status: 500 });
  }
}

