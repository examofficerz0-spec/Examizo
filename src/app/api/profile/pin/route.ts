import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { executeD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profileId, pin, currentPin } = await req.json();
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const db = readSharedDb();
    const targetIdx = (db.users || []).findIndex(
      (u: any) => String(u._id) === String(profileId) || String(u.id) === String(profileId)
    );

    if (targetIdx === -1) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const targetUser = db.users[targetIdx];

    // If currentPin is required for existing pin
    if (targetUser.pin && String(targetUser.pin).trim().length === 4) {
      if (currentPin && String(currentPin).trim() !== String(targetUser.pin).trim()) {
        return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 400 });
      }
    }

    let cleanPin: string | null = null;
    if (pin !== null && pin !== undefined && String(pin).trim() !== '') {
      const pinStr = String(pin).trim();
      if (!/^\d{4}$/.test(pinStr)) {
        return NextResponse.json({ error: 'PIN must be exactly 4 numeric digits' }, { status: 400 });
      }
      cleanPin = pinStr;
    }

    // 1. Update Cloudflare D1
    try {
      await executeD1('UPDATE users SET pin = ? WHERE id = ?', [cleanPin, String(profileId)]);
    } catch (e) {
      console.warn('[api/profile/pin] D1 update warning:', e);
    }

    // 2. Update Shared DB
    targetUser.pin = cleanPin;
    writeSharedDb(db);

    return NextResponse.json({
      success: true,
      hasPin: Boolean(cleanPin),
      message: cleanPin ? '4-digit PIN set successfully!' : 'PIN removed successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update PIN' }, { status: 500 });
  }
}
