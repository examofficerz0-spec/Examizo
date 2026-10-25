import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedUser, signUserToken } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1, executeD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const fullName = body.fullName || body.full_name || body.name;
    const nickname = body.nickname ? String(body.nickname).trim() : null;
    const dob = body.dob || body.dateOfBirth || body.date_of_birth;
    const courseId = body.courseId || body.course_id || body.locked_course_id;

    if (!fullName || !String(fullName).trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    if (!dob || !String(dob).trim()) {
      return NextResponse.json({ error: 'Date of birth (DOB) is required' }, { status: 400 });
    }

    if (!courseId || !String(courseId).trim()) {
      return NextResponse.json(
        { error: 'Course selection is required. A profile or sub-profile cannot be created without selecting a target curriculum course.' },
        { status: 400 }
      );
    }

    const rawPin = body.pin ? String(body.pin).trim() : null;
    let cleanPin: string | null = null;
    if (rawPin) {
      if (!/^\d{4}$/.test(rawPin)) {
        return NextResponse.json({ error: 'Profile PIN must be exactly 4 numeric digits (e.g. 1234)' }, { status: 400 });
      }
      cleanPin = rawPin;
    }
    const cleanAvatarColor = body.avatarColor ? String(body.avatarColor).trim() : null;

    const cleanFullName = String(fullName).trim();
    const cleanNickname = nickname && nickname.trim() ? nickname.trim() : null;
    const cleanDob = String(dob).trim();
    const displayName = cleanNickname || cleanFullName;
    const cleanCourseId = String(courseId).trim();

    // Auto-create / persist course if new curriculum track metadata is passed
    const courseData = body.courseData;
    if (courseData && courseData.courseName) {
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
        console.warn('[api/profile/create] auto-create course D1 err:', cErr);
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

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user: currentUser } = authResult;
    const mainEmail = (currentUser.account_email || currentUser.email || auth.email).toLowerCase().trim();

    // 1. Primary: Cloudflare D1
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

        const profileId = generateId();
        const profileEmail = `${mainEmail.split('@')[0]}+profile_${Date.now() % 10000}_${Math.floor(Math.random() * 1000)}@examizo.internal`;

        const parentDigiVerified = currentUser.digilocker_verified ? 1 : 0;
        const parentDigiJson = currentUser.digilocker_profile_json || '{}';

        await executeD1(
          `INSERT INTO users (id, name, full_name, nickname, dob, email, account_email, password_hash, status, xp_total, friends_json, friend_requests_json, created_at, locked_course_id, pin, avatar_color, digilocker_verified, digilocker_profile_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            profileId,
            cleanFullName,
            cleanFullName,
            cleanNickname,
            cleanDob,
            profileEmail,
            mainEmail,
            currentUser.password_hash || 'profile_nopass',
            'Active',
            0,
            '[]',
            '[]',
            new Date().toISOString(),
            cleanCourseId,
            cleanPin,
            cleanAvatarColor,
            parentDigiVerified,
            parentDigiJson,
          ]
        );

        // Also insert into dedicated sub_profiles table
        executeD1(
          `INSERT OR REPLACE INTO sub_profiles (id, parent_user_id, parent_email, name, full_name, nickname, dob, pin, avatar_color, locked_course_id, xp_total, status, is_primary, digilocker_verified, digilocker_profile_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Active', 0, ?, ?)`,
          [
            profileId,
            String(currentUser._id || currentUser.id || auth.userId),
            mainEmail,
            cleanFullName,
            cleanFullName,
            cleanNickname,
            cleanDob,
            cleanPin,
            cleanAvatarColor,
            cleanCourseId,
            parentDigiVerified,
            parentDigiJson,
          ]
        ).catch(() => {});

        // Mirror to sharedDb for local continuity
        try {
          const db = readSharedDb();
          if (db && db.users) {
            db.users.push({
              _id: profileId,
              id: profileId,
              name: cleanFullName,
              full_name: cleanFullName,
              nickname: cleanNickname,
              dob: cleanDob,
              email: profileEmail,
              password_hash: currentUser.password_hash || 'profile_nopass',
              account_email: mainEmail,
              locked_course_id: cleanCourseId,
              pin: cleanPin,
              avatar_color: cleanAvatarColor,
              status: 'Active',
              xp_total: 0,
              digilocker_verified: parentDigiVerified,
              digilocker_profile_json: parentDigiJson,
              digilockerProfile: currentUser.digilockerProfile || null,
              created_at: new Date().toISOString(),
            });
            if (!db.sub_profiles) db.sub_profiles = [];
            db.sub_profiles.push({
              id: profileId,
              _id: profileId,
              parent_user_id: String(currentUser._id || currentUser.id || auth.userId),
              parent_email: mainEmail,
              name: displayName,
              full_name: cleanFullName,
              nickname: cleanNickname,
              dob: cleanDob,
              pin: cleanPin,
              avatar_color: cleanAvatarColor,
              locked_course_id: cleanCourseId,
              xp_total: 0,
              status: 'Active',
              is_primary: 0,
              digilocker_verified: parentDigiVerified,
              digilocker_profile_json: parentDigiJson,
              digilockerProfile: currentUser.digilockerProfile || null,
              created_at: new Date().toISOString(),
            });
            writeSharedDb(db);
          }
        } catch (_) {}

        const token = signUserToken({
          userId: profileId,
          email: profileEmail,
          name: displayName,
          lockedCourseId: cleanCourseId,
        });

        const response = NextResponse.json({
          success: true,
          profile: {
            id: profileId,
            name: displayName,
            fullName: cleanFullName,
            nickname: cleanNickname,
            dob: cleanDob,
            displayName,
            email: profileEmail,
            lockedCourseId: cleanCourseId,
            hasPin: Boolean(cleanPin),
            avatarColor: cleanAvatarColor,
          },
          needsCourseSelection: false,
        });

        response.cookies.set('student_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
          sameSite: 'lax',
        });

        return response;
      }
    } catch (d1Err) {
      console.warn('[api/profile/create] D1 error:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
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
    const profileEmail = `${mainEmail.split('@')[0]}+profile_${Date.now() % 10000}@examizo.internal`;

    const newProfile = {
      _id: profileId,
      id: profileId,
      name: cleanFullName,
      full_name: cleanFullName,
      nickname: cleanNickname,
      dob: cleanDob,
      email: profileEmail,
      password_hash: currentUser.password_hash || 'profile_nopass',
      account_email: mainEmail,
      locked_course_id: cleanCourseId,
      pin: cleanPin,
      avatar_color: cleanAvatarColor,
      status: 'Active',
      xp_total: 0,
      digilocker_verified: currentUser.digilocker_verified ? 1 : 0,
      digilocker_profile_json: currentUser.digilocker_profile_json || '{}',
      digilockerProfile: currentUser.digilockerProfile || null,
      created_at: new Date().toISOString(),
    };

    if (!currentUser.account_email) {
      currentUser.account_email = mainEmail;
    }

    db.users.push(newProfile);
    if (!db.sub_profiles) db.sub_profiles = [];
    db.sub_profiles.push({
      id: profileId,
      _id: profileId,
      parent_user_id: String(currentUser._id || currentUser.id || auth.userId),
      parent_email: mainEmail,
      name: displayName,
      full_name: cleanFullName,
      nickname: cleanNickname,
      dob: cleanDob,
      pin: cleanPin,
      avatar_color: cleanAvatarColor,
      locked_course_id: cleanCourseId,
      xp_total: 0,
      status: 'Active',
      is_primary: 0,
      digilocker_verified: currentUser.digilocker_verified ? 1 : 0,
      digilocker_profile_json: currentUser.digilocker_profile_json || '{}',
      digilockerProfile: currentUser.digilockerProfile || null,
      created_at: new Date().toISOString(),
    });
    writeSharedDb(db);

    const token = signUserToken({
      userId: String(newProfile._id),
      email: newProfile.email,
      name: displayName,
      lockedCourseId: cleanCourseId,
    });

    const response = NextResponse.json({
      success: true,
      profile: {
        id: String(newProfile._id),
        name: displayName,
        fullName: cleanFullName,
        nickname: cleanNickname,
        dob: cleanDob,
        displayName,
        email: newProfile.email,
        lockedCourseId: cleanCourseId,
        hasPin: Boolean(cleanPin),
        avatarColor: cleanAvatarColor,
      },
      needsCourseSelection: false,
    });

    response.cookies.set('student_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create profile' }, { status: 500 });
  }
}
