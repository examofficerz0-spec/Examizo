import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
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

    const { profileId } = await req.json();
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user: currentUser } = authResult;

    if (String(profileId) === String(currentUser._id || currentUser.id) || String(profileId) === String(auth.userId)) {
      return NextResponse.json({ error: 'Cannot delete active profile. Switch to another profile first.' }, { status: 400 });
    }

    const mainEmail = (currentUser.account_email || currentUser.email || auth.email).toLowerCase().trim();

    // 1. Primary: Cloudflare D1
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE id = ? LIMIT 1', [profileId]);
      if (d1Users && d1Users.length > 0) {
        const targetProfile = d1Users[0];
        if (targetProfile.email.toLowerCase() === mainEmail) {
          return NextResponse.json({ error: 'Cannot delete primary account profile' }, { status: 400 });
        }

        await executeD1("UPDATE users SET status = 'Deleted' WHERE id = ?", [profileId]);

        // Also update sharedDb if exists
        try {
          const db = readSharedDb();
          if (db && db.users) {
            db.users = (db.users || []).filter((u: any) => String(u._id) !== String(profileId) && String(u.id) !== String(profileId));
            writeSharedDb(db);
          }
        } catch (_) {}

        return NextResponse.json({ success: true });
      }
    } catch (d1Err) {
      console.warn('[api/profile/delete] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const targetProfile = (db.users || []).find((u: any) => String(u._id) === String(profileId) || String(u.id) === String(profileId));
    if (!targetProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (targetProfile.email.toLowerCase() === mainEmail) {
      return NextResponse.json({ error: 'Cannot delete primary account profile' }, { status: 400 });
    }

    const targetAccountEmail = (targetProfile.account_email || '').toLowerCase();
    if (targetAccountEmail && targetAccountEmail !== mainEmail) {
      return NextResponse.json({ error: 'Unauthorized profile deletion' }, { status: 403 });
    }

    db.users = (db.users || []).filter((u: any) => String(u._id) !== String(profileId) && String(u.id) !== String(profileId));
    writeSharedDb(db);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete profile' }, { status: 500 });
  }
}
