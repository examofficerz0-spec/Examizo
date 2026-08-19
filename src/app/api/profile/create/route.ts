import { NextResponse } from 'next/server';
import { User } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1, executeD1 } from '@/lib/d1';

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const name = body.name;
    const courseId = body.courseId || body.course_id || body.locked_course_id;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
    }

    if (!courseId || !String(courseId).trim()) {
      return NextResponse.json(
        { error: 'Course selection is required. A profile or sub-profile cannot be created without selecting a target curriculum course.' },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanCourseId = String(courseId).trim();

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user: currentUser, isMemoryMode, isD1 } = authResult;
    const mainEmail = (currentUser.account_email || currentUser.email || auth.email).toLowerCase().trim();

    // 1. Try Cloudflare D1 first
    try {
      const d1Users = await queryD1(
        "SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(email) LIKE ? OR id = ?) AND status != 'Deleted' AND name != 'Deleted User' AND status != 'Suspended'",
        [mainEmail, `${mainEmail.split('@')[0]}+%`, String(currentUser._id || currentUser.id || auth.userId)]
      );

      if (d1Users && d1Users.length > 0) {
        if (d1Users.length >= 4) {
          return NextResponse.json(
            { error: 'Maximum 4 profiles per account reached. Delete a profile to create a new one.' },
            { status: 400 }
          );
        }

        const profileId = crypto.randomUUID();
        const profileEmail = `${mainEmail.split('@')[0]}+profile_${Date.now() % 10000}_${Math.floor(Math.random() * 1000)}@exammaster.internal`;

        await executeD1(
          `INSERT INTO users (id, name, email, password_hash, status, xp_total, friends_json, friend_requests_json, created_at, locked_course_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            profileId,
            cleanName,
            profileEmail,
            currentUser.password_hash || 'profile_nopass',
            'Active',
            0,
            '[]',
            '[]',
            new Date().toISOString(),
            cleanCourseId,
          ]
        );

        // Mirror to sharedDb for local continuity
        try {
          const db = readSharedDb();
          if (db && db.users) {
            db.users.push({
              _id: profileId,
              name: cleanName,
              email: profileEmail,
              password_hash: currentUser.password_hash || 'profile_nopass',
              account_email: mainEmail,
              locked_course_id: cleanCourseId,
              status: 'Active',
              xp_total: 0,
              created_at: new Date().toISOString(),
            });
            writeSharedDb(db);
          }
        } catch (_) {}

        // Sign JWT token for the newly created profile with lockedCourseId
        const token = signUserToken({
          userId: profileId,
          email: profileEmail,
          name: cleanName,
          lockedCourseId: cleanCourseId,
        });

        const response = NextResponse.json({
          success: true,
          profile: {
            id: profileId,
            name: cleanName,
            email: profileEmail,
            lockedCourseId: cleanCourseId,
          },
          needsCourseSelection: false,
        });

        response.cookies.set('student_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });

        return response;
      }
    } catch (d1Err) {
      console.warn('[api/profile/create] D1 error:', d1Err);
    }

    // 2. Memory Mode Fallback
    if (isMemoryMode) {
      const db = readSharedDb();
      const existingProfiles = (db.users || []).filter(
        (u: any) =>
          u.status !== 'Deleted' &&
          ((u.email && u.email.toLowerCase() === mainEmail) ||
          (u.account_email && u.account_email.toLowerCase() === mainEmail))
      );

      if (existingProfiles.length >= 4) {
        return NextResponse.json(
          { error: 'Maximum 4 profiles per account reached. Delete a profile to create a new one.' },
          { status: 400 }
        );
      }

      const profileId = generateId();
      const profileEmail = `${mainEmail.split('@')[0]}+profile_${Date.now() % 10000}@exammaster.internal`;

      const newProfile = {
        _id: profileId,
        name: cleanName,
        email: profileEmail,
        password_hash: currentUser.password_hash || 'profile_nopass',
        account_email: mainEmail,
        locked_course_id: cleanCourseId,
        status: 'Active',
        xp_total: 0,
        created_at: new Date().toISOString(),
      };

      if (!currentUser.account_email) {
        currentUser.account_email = mainEmail;
      }

      db.users.push(newProfile);
      writeSharedDb(db);

      const token = signUserToken({
        userId: String(newProfile._id),
        email: newProfile.email,
        name: newProfile.name,
        lockedCourseId: cleanCourseId,
      });

      const response = NextResponse.json({
        success: true,
        profile: {
          id: String(newProfile._id),
          name: newProfile.name,
          email: newProfile.email,
          lockedCourseId: cleanCourseId,
        },
        needsCourseSelection: false,
      });

      response.cookies.set('student_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    // 3. Mongoose Mode (only if not D1 and active mongoose connection exists)
    if (!isD1 && currentUser.save) {
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
        locked_course_id: cleanCourseId,
        status: 'Active',
        xp_total: 0,
      });

      const token = signUserToken({
        userId: newProfile._id.toString(),
        email: newProfile.email,
        name: newProfile.name,
        lockedCourseId: cleanCourseId,
      });

      const response = NextResponse.json({
        success: true,
        profile: {
          id: newProfile._id.toString(),
          name: newProfile.name,
          email: newProfile.email,
          lockedCourseId: cleanCourseId,
        },
        needsCourseSelection: false,
      });

      response.cookies.set('student_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create profile' }, { status: 500 });
  }
}
