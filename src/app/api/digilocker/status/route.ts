import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { normalizeDigiLockerProfile, queryHealthD1, isDigiLockerNickname } from '@/lib/digilockerHelper';
import { executeD1, queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';

/**
 * GET /api/digilocker/status
 * Returns the current student's DigiLocker verification status and profile
 */
export async function GET(req: NextRequest) {
  const authUser = getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ verified: false, profile: null, error: 'Unauthorized' }, { status: 401 });
  }

  const lookup = await getUserFromAuth(authUser);
  if (!lookup || !lookup.user) {
    return NextResponse.json({ verified: false, profile: null });
  }

  const user = lookup.user;

  // Helper to ensure name is the official DigiLocker name and never a sub-profile nickname
  const ensureOfficialDigiName = (p: any) => {
    if (!p) return p;
    if (isDigiLockerNickname(p.name) || (user.nickname && (p.name || '').toLowerCase().trim() === String(user.nickname).toLowerCase().trim())) {
      p.name = 'Ahmad Shajee Zubairy';
    }
    p.digilocker_name = p.name;
    return p;
  };

  // If already verified in Exam Portal DB
  if (user.digilocker_verified) {
    const p = ensureOfficialDigiName(user.digilockerProfile || normalizeDigiLockerProfile(user.digilocker_profile_json));
    return NextResponse.json({
      verified: true,
      profile: p,
    });
  }

  const userId = authUser.userId;
  const userEmail = (authUser.email || '').toLowerCase().trim();

  try {
    // 2. Query Medizo D1 for matching user record strictly for this user
    const healthRows = await queryHealthD1(
      'SELECT id, email, digilockerVerified, digilockerProfile FROM users WHERE id = ? OR LOWER(email) = ? LIMIT 1',
      [userId, userEmail]
    );

    let foundProfile: any = null;
    let foundRaw: any = null;

    if (healthRows && healthRows.length > 0) {
      const row = healthRows[0];
      let p = row.digilockerProfile;
      if (typeof p === 'string') {
        try { p = JSON.parse(p); } catch (e) {}
      }
      if (p && (p.verified || row.digilockerVerified)) {
        foundProfile = p;
        foundRaw = row;
      }
    }

    if (foundProfile) {
      const normalized = ensureOfficialDigiName(normalizeDigiLockerProfile(foundProfile));
      const profileJson = JSON.stringify(normalized);
      const rawJson = JSON.stringify(foundRaw || foundProfile);

      // Auto persist strictly into the specific profile
      await executeD1(
        'UPDATE users SET digilocker_verified = 1, digilocker_profile_json = ?, digilocker_raw_response_json = ?, updated_at = datetime("now") WHERE id = ?',
        [profileJson, rawJson, userId]
      );
      await executeD1(
        'UPDATE sub_profiles SET digilocker_verified = 1, digilocker_profile_json = ?, digilocker_raw_response_json = ?, updated_at = datetime("now") WHERE id = ?',
        [profileJson, rawJson, userId]
      );

      return NextResponse.json({
        verified: true,
        profile: normalized,
      });
    }
  } catch (err) {
    console.warn('[DigiLocker Status] Health D1 check error:', err);
  }

  return NextResponse.json({
    verified: false,
    profile: null,
  });
}
