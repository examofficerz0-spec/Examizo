import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const auth = getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const authResult = await getUserFromAuth(auth);
    if (
      !authResult ||
      !authResult.user ||
      authResult.user.status === 'Deleted' ||
      authResult.user.name === 'Deleted User' ||
      authResult.user.status === 'Suspended' ||
      authResult.user.status === 'suspended' ||
      authResult.user.status === 'SUSPENDED'
    ) {
      const res = NextResponse.json({ error: 'User deleted or suspended', deleted: true }, { status: 401 });
      res.cookies.set('student_token', '', { maxAge: 0, path: '/', expires: new Date(0) });
      res.cookies.delete('student_token');
      return res;
    }

    const { user: currentUser } = authResult;
    const currentEmail = (currentUser.email || auth.email || '').toLowerCase().trim();
    const accountEmail = (currentUser.account_email || '').toLowerCase().trim();
    const baseHandle = (accountEmail || currentEmail).split('@')[0].split('+')[0].trim();

    // 1. Primary: Cloudflare D1
    try {
      const parentEmailTarget = (accountEmail || currentEmail).toLowerCase().trim();
      const parentUserId = String(currentUser._id || currentUser.id || auth.userId);
      const d1Users = await queryD1(
        "SELECT * FROM users WHERE (LOWER(email) LIKE ? OR LOWER(email) LIKE ? OR LOWER(account_email) = ? OR LOWER(account_email) LIKE ? OR id = ?) AND status != 'Deleted' AND name != 'Deleted User' AND status != 'Suspended' AND status != 'suspended'",
        [`${baseHandle}@%`, `${baseHandle}+%`, parentEmailTarget, `${baseHandle}@%`, parentUserId]
      );

      let d1SubProfiles: any[] = [];
      try {
        d1SubProfiles = await queryD1(
          "SELECT * FROM sub_profiles WHERE (parent_user_id = ? OR LOWER(parent_email) = ?) AND status != 'Deleted' AND status != 'Suspended'",
          [parentUserId, parentEmailTarget]
        );
      } catch (_) {}

      // Map and merge profiles uniquely by ID
      const profileMap = new Map<string, any>();
      (d1Users || []).forEach((u: any) => {
        profileMap.set(String(u.id), u);
      });
      (d1SubProfiles || []).forEach((sp: any) => {
        const id = String(sp.id);
        if (!profileMap.has(id)) {
          profileMap.set(id, {
            ...sp,
            email: sp.email || `${baseHandle}+sub_${id.slice(-4)}@examizo.com`,
            account_email: parentEmailTarget,
          });
        } else {
          // Merge metadata
          const existing = profileMap.get(id);
          profileMap.set(id, {
            ...existing,
            ...sp,
            locked_course_id: sp.locked_course_id || existing.locked_course_id,
            pin: sp.pin ?? existing.pin,
            avatar_color: sp.avatar_color || existing.avatar_color,
          });
        }
      });

      const combinedProfiles = Array.from(profileMap.values());

      if (combinedProfiles.length > 0) {
        const d1Courses = await queryD1('SELECT id, name FROM courses');
        const courseMap = new Map((d1Courses || []).map((c: any) => [c.id, c.name]));

        const currentIdStr = String(currentUser._id || currentUser.id || auth.userId);
        
        const sortedD1Users = [...combinedProfiles].sort((a: any, b: any) => {
          const aIsPrimary = Boolean(a.is_primary === 1 || a.is_primary === true || (a.email && !a.email.includes('+')));
          const bIsPrimary = Boolean(b.is_primary === 1 || b.is_primary === true || (b.email && !b.email.includes('+')));
          if (aIsPrimary && !bIsPrimary) return -1;
          if (!aIsPrimary && bIsPrimary) return 1;
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });

        const avatarPalettes = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600'];

        // Check if any profile in family has digilocker verification
        const verifiedItem = combinedProfiles.find(
          (p: any) => p.digilocker_verified === 1 || p.digilocker_verified === true || p.digilocker_verified === '1'
        );
        let sharedDigiProfile = verifiedItem?.digilocker_profile_json;
        if (typeof sharedDigiProfile === 'string') {
          try { sharedDigiProfile = JSON.parse(sharedDigiProfile); } catch (_) {}
        }

        const profiles = sortedD1Users.map((u: any, idx: number) => {
          const isPrimary = Boolean(u.is_primary === 1 || u.is_primary === true || (u.email && !u.email.includes('+')));
          const effectiveFullName = u.full_name || u.name;
          const effectiveNickname = u.nickname && String(u.nickname).trim() ? String(u.nickname).trim() : null;
          const displayName = effectiveNickname || effectiveFullName;

          let uDigi = u.digilocker_profile_json;
          if (typeof uDigi === 'string') {
            try { uDigi = JSON.parse(uDigi); } catch (_) {}
          }
          const hasOwnVerification = Boolean(u.digilocker_verified === 1 || u.digilocker_verified === true || u.digilocker_verified === '1');
          const isVerified = Boolean(hasOwnVerification || verifiedItem);
          const activeDigiProfile = uDigi || sharedDigiProfile || null;

          return {
            id: String(u.id),
            name: displayName,
            fullName: effectiveFullName,
            nickname: effectiveNickname,
            dob: u.dob || null,
            displayName,
            email: u.email || `${baseHandle}@examizo.com`,
            accountEmail: `${baseHandle}@${((u.email || '').split('@')[1] || 'examizo.com')}`,
            lockedCourseId: u.locked_course_id || null,
            lockedCourseName: u.locked_course_id ? (courseMap.get(u.locked_course_id) || null) : null,
            isActive: String(u.id) === currentIdStr,
            isPrimary,
            hasPin: Boolean(u.pin && String(u.pin).trim().length === 4),
            avatarColor: u.avatar_color || avatarPalettes[idx % avatarPalettes.length],
            xp_total: u.xp_total || 0,
            digilocker_verified: isVerified,
            digilockerProfile: activeDigiProfile,
          };
        });

        return NextResponse.json({ success: true, profiles });
      }
    } catch (d1Err) {
      console.warn('[api/profile/list] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const currentIdStr = String(currentUser._id || currentUser.id || auth.userId);
    const parentEmailTarget = (accountEmail || currentEmail).toLowerCase().trim();

    const memProfileMap = new Map<string, any>();
    (db.users || []).forEach((u: any) => {
      if (u.status === 'Deleted' || u.name === 'Deleted User') return;
      const uEmail = (u.email || '').toLowerCase().trim();
      const uAcct = (u.account_email || '').toLowerCase().trim();
      const uHandle = (uAcct || uEmail).split('@')[0].split('+')[0].trim();
      if (uHandle === baseHandle || String(u._id || u.id) === currentIdStr) {
        memProfileMap.set(String(u._id || u.id), u);
      }
    });

    (db.sub_profiles || []).forEach((sp: any) => {
      if (sp.status === 'Deleted') return;
      const id = String(sp._id || sp.id);
      const isFamily = String(sp.parent_user_id) === currentIdStr || (sp.parent_email && sp.parent_email.toLowerCase().trim() === parentEmailTarget);
      if (isFamily) {
        if (!memProfileMap.has(id)) {
          memProfileMap.set(id, {
            ...sp,
            email: sp.email || `${baseHandle}+sub_${id.slice(-4)}@examizo.com`,
            account_email: parentEmailTarget,
          });
        } else {
          const ex = memProfileMap.get(id);
          memProfileMap.set(id, { ...ex, ...sp });
        }
      }
    });

    const family = Array.from(memProfileMap.values());
    const avatarPalettes = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600'];

    const memVerifiedItem = family.find(
      (p: any) => p.digilocker_verified === 1 || p.digilocker_verified === true || p.digilocker_verified === '1' || p.digilockerProfile?.verified
    );
    let memSharedDigi = memVerifiedItem?.digilockerProfile || memVerifiedItem?.digilocker_profile_json;
    if (typeof memSharedDigi === 'string') {
      try { memSharedDigi = JSON.parse(memSharedDigi); } catch (_) {}
    }

    const profiles = family.map((u: any, idx: number) => {
      const lockedCourse = (db.courses || []).find((c: any) => String(c._id) === String(u.locked_course_id) || String(c.id) === String(u.locked_course_id)) || null;
      const isPrimary = Boolean(u.is_primary === 1 || u.is_primary === true || !(u.email || '').includes('+'));
      const effectiveFullName = u.full_name || u.name;
      const effectiveNickname = u.nickname && String(u.nickname).trim() ? String(u.nickname).trim() : null;
      const displayName = effectiveNickname || effectiveFullName;

      let uDigi = u.digilockerProfile || u.digilocker_profile_json;
      if (typeof uDigi === 'string') {
        try { uDigi = JSON.parse(uDigi); } catch (_) {}
      }
      const isVerified = Boolean(u.digilocker_verified || memVerifiedItem);
      const activeDigiProfile = uDigi || memSharedDigi || null;

      return {
        id: String(u._id || u.id),
        name: displayName,
        fullName: effectiveFullName,
        nickname: effectiveNickname,
        dob: u.dob || null,
        displayName,
        email: u.email,
        accountEmail: `${baseHandle}@${((u.email || '').split('@')[1] || 'examizo.com')}`,
        lockedCourseId: u.locked_course_id || null,
        lockedCourseName: lockedCourse?.name || null,
        isActive: String(u._id || u.id) === currentIdStr,
        isPrimary,
        hasPin: Boolean(u.pin && String(u.pin).trim().length === 4),
        avatarColor: u.avatar_color || avatarPalettes[idx % avatarPalettes.length],
        xp_total: u.xp_total || 0,
        digilocker_verified: isVerified,
        digilockerProfile: activeDigiProfile,
      };
    });

    if (!profiles || profiles.length === 0) {
      const effectiveFullName = currentUser.full_name || currentUser.name || auth.name || 'Student';
      const effectiveNickname = currentUser.nickname && String(currentUser.nickname).trim() ? String(currentUser.nickname).trim() : null;
      const displayName = effectiveNickname || effectiveFullName;

      const defaultProfile = {
        id: String(currentUser._id || currentUser.id || auth.userId),
        name: displayName,
        fullName: effectiveFullName,
        nickname: effectiveNickname,
        dob: currentUser.dob || null,
        displayName,
        email: currentUser.email || auth.email,
        accountEmail: accountEmail || currentEmail,
        lockedCourseId: currentUser.locked_course_id || auth.lockedCourseId || null,
        lockedCourseName: null,
        isActive: true,
        isPrimary: true,
        hasPin: Boolean(currentUser.pin && String(currentUser.pin).trim().length === 4),
        avatarColor: currentUser.avatar_color || 'bg-blue-600',
        xp_total: currentUser.xp_total || 0,
        digilocker_verified: Boolean(currentUser.digilocker_verified),
        digilockerProfile: currentUser.digilockerProfile || null,
      };
      return NextResponse.json({ success: true, profiles: [defaultProfile] });
    }

    return NextResponse.json({ success: true, profiles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list profiles' }, { status: 500 });
  }
}
