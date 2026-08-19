import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { queryD1, executeD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Resolve joinCode details and request status for authenticated user
export async function GET(request: Request) {
  try {
    const auth = getAuthenticatedUser();
    
    const { searchParams } = new URL(request.url);
    const joinCode = (searchParams.get('joinCode') || '').trim().toUpperCase();

    if (!joinCode) {
      return NextResponse.json({ error: 'joinCode is required' }, { status: 400 });
    }

    // 1. Primary: Cloudflare D1
    try {
      const allUsers = await queryD1("SELECT id, name, email, friends_json, friend_requests_json FROM users WHERE status != 'Deleted'");
      if (allUsers && allUsers.length > 0) {
        const hostUser = allUsers.find(
          (u: any) => u.id.slice(0, 8).toUpperCase() === joinCode
        );

        if (!hostUser) {
          return NextResponse.json({ error: 'Invalid invite link or host user not found' }, { status: 404 });
        }

        if (!auth) {
          return NextResponse.json({
            hostUser: { name: hostUser.name, email: hostUser.email },
            status: 'unauthenticated',
          });
        }

        const currentUser = allUsers.find((u: any) => u.id === auth.userId || u.email?.toLowerCase() === auth.email?.toLowerCase());
        if (!currentUser) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (hostUser.id === currentUser.id) {
          return NextResponse.json({
            hostUser: { name: hostUser.name, email: hostUser.email },
            status: 'self',
          });
        }

        let hostFriends: string[] = [];
        try {
          hostFriends = typeof hostUser.friends_json === 'string' ? JSON.parse(hostUser.friends_json) : [];
        } catch (_) {}

        if (hostFriends.includes(currentUser.id)) {
          return NextResponse.json({
            hostUser: { name: hostUser.name, email: hostUser.email },
            status: 'already_friends',
          });
        }

        let requests: any[] = [];
        try {
          requests = typeof hostUser.friend_requests_json === 'string' ? JSON.parse(hostUser.friend_requests_json) : [];
        } catch (_) {}

        const existingReq = requests.find(
          (r: any) => r.requesterId === currentUser.id && r.status === 'pending'
        );

        if (existingReq) {
          return NextResponse.json({
            hostUser: { name: hostUser.name, email: hostUser.email },
            status: 'pending',
          });
        }

        return NextResponse.json({
          hostUser: { name: hostUser.name, email: hostUser.email },
          status: 'can_request',
        });
      }
    } catch (d1Err) {
      console.warn('[friends/request GET] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const hostUser = (db.users || []).find(
      (u) => (u._id || u.id).slice(0, 8).toUpperCase() === joinCode
    );

    if (!hostUser) {
      return NextResponse.json({ error: 'Invalid invite link or host user not found' }, { status: 404 });
    }

    if (!auth) {
      return NextResponse.json({
        hostUser: { name: hostUser.name, email: hostUser.email },
        status: 'unauthenticated',
      });
    }

    const currentUser = (db.users || []).find((u) => u._id === auth.userId || u.id === auth.userId);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if ((hostUser._id || hostUser.id) === (currentUser._id || currentUser.id)) {
      return NextResponse.json({
        hostUser: { name: hostUser.name, email: hostUser.email },
        status: 'self',
      });
    }

    const hostFriends: string[] = hostUser.friends || [];
    if (hostFriends.includes(currentUser._id || currentUser.id)) {
      return NextResponse.json({
        hostUser: { name: hostUser.name, email: hostUser.email },
        status: 'already_friends',
      });
    }

    const existingReq = (hostUser.friendRequests || []).find(
      (r: any) => r.requesterId === (currentUser._id || currentUser.id) && r.status === 'pending'
    );

    if (existingReq) {
      return NextResponse.json({
        hostUser: { name: hostUser.name, email: hostUser.email },
        status: 'pending',
      });
    }

    return NextResponse.json({
      hostUser: { name: hostUser.name, email: hostUser.email },
      status: 'can_request',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Send join request to host user by joinCode
export async function POST(request: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized. Please login or register first.' }, { status: 401 });
    }

    const { joinCode } = await request.json();
    if (!joinCode) {
      return NextResponse.json({ error: 'joinCode is required' }, { status: 400 });
    }

    const cleanCode = joinCode.trim().toUpperCase();

    // 1. Primary: Cloudflare D1
    try {
      const allUsers = await queryD1("SELECT id, name, email, xp_total, friends_json, friend_requests_json FROM users WHERE status != 'Deleted'");
      if (allUsers && allUsers.length > 0) {
        const hostUser = allUsers.find(
          (u: any) => u.id.slice(0, 8).toUpperCase() === cleanCode
        );

        if (!hostUser) {
          return NextResponse.json({ error: 'Host user not found for this invite link' }, { status: 404 });
        }

        const currentUser = allUsers.find((u: any) => u.id === auth.userId || u.email?.toLowerCase() === auth.email?.toLowerCase());
        if (!currentUser) {
          return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
        }

        if (hostUser.id === currentUser.id) {
          return NextResponse.json({ error: 'You cannot send a join request to yourself' }, { status: 400 });
        }

        let hostFriends: string[] = [];
        try {
          hostFriends = typeof hostUser.friends_json === 'string' ? JSON.parse(hostUser.friends_json) : [];
        } catch (_) {}

        if (hostFriends.includes(currentUser.id)) {
          return NextResponse.json({ message: 'You are already in this user\'s friends arena!', status: 'already_friends' });
        }

        let requests: any[] = [];
        try {
          requests = typeof hostUser.friend_requests_json === 'string' ? JSON.parse(hostUser.friend_requests_json) : [];
        } catch (_) {}

        const existingReq = requests.find((r: any) => r.requesterId === currentUser.id && r.status === 'pending');
        if (!existingReq) {
          requests.push({
            requesterId: currentUser.id,
            requesterName: currentUser.name,
            requesterEmail: currentUser.email,
            requesterXp: currentUser.xp_total || 0,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
          await executeD1('UPDATE users SET friend_requests_json = ? WHERE id = ?', [JSON.stringify(requests), hostUser.id]);
        }

        return NextResponse.json({
          success: true,
          message: `Join request sent to ${hostUser.name}! Waiting for them to accept.`,
          hostName: hostUser.name,
        });
      }
    } catch (d1Err) {
      console.warn('[friends/request POST] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const hostIndex = db.users.findIndex(
      (u) => (u._id || u.id).slice(0, 8).toUpperCase() === cleanCode
    );

    if (hostIndex === -1) {
      return NextResponse.json({ error: 'Host user not found for this invite link' }, { status: 404 });
    }

    const hostUser = db.users[hostIndex];
    const currentUser = db.users.find((u) => u._id === auth.userId || u.id === auth.userId);

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    if ((hostUser._id || hostUser.id) === (currentUser._id || currentUser.id)) {
      return NextResponse.json({ error: 'You cannot send a join request to yourself' }, { status: 400 });
    }

    const hostFriends: string[] = hostUser.friends || [];
    if (hostFriends.includes(currentUser._id || currentUser.id)) {
      return NextResponse.json({ message: 'You are already in this user\'s friends arena!', status: 'already_friends' });
    }

    const requests: any[] = hostUser.friendRequests || [];
    const existingReq = requests.find((r) => r.requesterId === (currentUser._id || currentUser.id) && r.status === 'pending');

    if (!existingReq) {
      requests.push({
        requesterId: currentUser._id || currentUser.id,
        requesterName: currentUser.name,
        requesterEmail: currentUser.email,
        requesterXp: currentUser.xp_total || 0,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      db.users[hostIndex].friendRequests = requests;
      writeSharedDb(db);
    }

    return NextResponse.json({
      success: true,
      message: `Join request sent to ${hostUser.name}! Waiting for them to accept.`,
      hostName: hostUser.name,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
