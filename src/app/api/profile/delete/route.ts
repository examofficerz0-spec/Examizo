import { NextResponse } from 'next/server';
import { User } from '@/lib/models';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';

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

    const { user: currentUser, isMemoryMode } = authResult;

    if (String(profileId) === String(currentUser._id) || String(profileId) === String(auth.userId)) {
      return NextResponse.json({ error: 'Cannot delete active profile. Switch to another profile first.' }, { status: 400 });
    }

    if (isMemoryMode) {
      const db = readSharedDb();
      const mainEmail = (currentUser.account_email || currentUser.email).toLowerCase();

      const targetProfile = (db.users || []).find((u: any) => String(u._id) === String(profileId));
      if (!targetProfile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      if (targetProfile.email.toLowerCase() === mainEmail) {
        return NextResponse.json({ error: 'Cannot delete primary account profile' }, { status: 400 });
      }

      const targetAccountEmail = (targetProfile.account_email || '').toLowerCase();
      if (targetAccountEmail !== mainEmail) {
        return NextResponse.json({ error: 'Unauthorized profile deletion' }, { status: 403 });
      }

      db.users = (db.users || []).filter((u: any) => String(u._id) !== String(profileId));
      writeSharedDb(db);

      return NextResponse.json({ success: true });
    }

    // Mongoose Mode
    const mainEmail = (currentUser.account_email || currentUser.email).toLowerCase();

    let targetProfile = null;
    try {
      targetProfile = await User.findById(profileId);
    } catch (e) {
      targetProfile = await User.findOne({ _id: profileId });
    }

    if (!targetProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (targetProfile.email.toLowerCase() === mainEmail) {
      return NextResponse.json({ error: 'Cannot delete primary account profile' }, { status: 400 });
    }

    const targetAccountEmail = (targetProfile.account_email || '').toLowerCase();
    if (targetAccountEmail !== mainEmail) {
      return NextResponse.json({ error: 'Unauthorized profile deletion' }, { status: 403 });
    }

    targetProfile.status = 'Deleted';
    await targetProfile.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete profile' }, { status: 500 });
  }
}

