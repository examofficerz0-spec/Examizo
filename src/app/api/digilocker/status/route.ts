import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { normalizeDigiLockerProfile, queryHealthD1 } from '@/lib/digilockerHelper';
import { executeD1 } from '@/lib/d1';

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

  // If already verified in Exam Portal DB
  if (user.digilocker_verified && user.digilockerProfile) {
    return NextResponse.json({
      verified: true,
      profile: user.digilockerProfile,
    });
  }

  // If unverified in Exam Portal DB, check if verification recently happened on Medizo D1
  const userId = authUser.userId;
  const userEmail = (authUser.email || '').toLowerCase().trim();

  try {
    // 2. Query Medizo D1 for matching user record
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

    // Fallback: check recent verified records if email or ID match
    if (!foundProfile) {
      const recentRows = await queryHealthD1(
        'SELECT id, email, digilockerVerified, digilockerProfile FROM users WHERE (digilockerVerified = 1 OR digilockerVerified = "1") AND digilockerProfile IS NOT NULL ORDER BY updatedAt DESC LIMIT 10'
      );
      if (recentRows && recentRows.length > 0) {
        for (const row of recentRows) {
          let p = row.digilockerProfile;
          if (typeof p === 'string') {
            try { p = JSON.parse(p); } catch (e) {}
          }
          if (p && p.verified) {
            const rowEmail = (row.email || '').toLowerCase().trim();
            const profEmail = (p.email || '').toLowerCase().trim();
            if (row.id === userId || (rowEmail && rowEmail === userEmail) || (profEmail && profEmail === userEmail)) {
              foundProfile = p;
              foundRaw = row;
              break;
            }
          }
        }
      }
    }

    if (foundProfile) {
      const normalized = normalizeDigiLockerProfile(foundProfile);
      const profileJson = JSON.stringify(normalized);
      const rawJson = JSON.stringify(foundRaw || foundProfile);

      // Auto persist into Exam Portal D1
      await executeD1(
        'UPDATE users SET digilocker_verified = 1, digilocker_profile_json = ?, digilocker_raw_response_json = ? WHERE id = ? OR LOWER(email) = ?',
        [profileJson, rawJson, userId, userEmail]
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
