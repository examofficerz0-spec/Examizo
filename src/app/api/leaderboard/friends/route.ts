import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User } from '@/lib/models';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { queryD1, executeD1 } from '@/lib/d1';

// GET: Fetch user's friends leaderboard or search registered students
export async function GET(request: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();

    // 1. Try D1 first
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE id = ? OR email = ? LIMIT 1', [String(auth.userId), String(auth.email).toLowerCase()]);
      if (d1Users && d1Users.length > 0) {
        const currentUser = d1Users[0];
        let friendsIds: string[] = [];
        try {
          friendsIds = typeof currentUser.friends_json === 'string' ? JSON.parse(currentUser.friends_json) : (currentUser.friends || []);
        } catch (_) {}

        if (searchQuery) {
          const matches = await queryD1(
            "SELECT id, name, email, xp_total FROM users WHERE id != ? AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ?) AND status != 'Deleted' LIMIT 10",
            [currentUser.id, `%${searchQuery}%`, `%${searchQuery}%`]
          );
          const searchResults = (matches || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            xp_total: u.xp_total || 0,
            isAlreadyFriend: friendsIds.includes(u.id),
          }));
          return NextResponse.json({ searchResults });
        }

        const groupIds = new Set<string>([currentUser.id, ...friendsIds]);
        const allUsers = await queryD1("SELECT id, name, email, xp_total, friends_json FROM users WHERE status != 'Deleted'");
        (allUsers || []).forEach((u: any) => {
          if (groupIds.has(u.id)) {
            let fList: string[] = [];
            try {
              fList = typeof u.friends_json === 'string' ? JSON.parse(u.friends_json) : [];
            } catch (_) {}
            fList.forEach((fid) => groupIds.add(fid));
          }
        });

        const friendUsers = (allUsers || [])
          .filter((u: any) => groupIds.has(u.id))
          .sort((a: any, b: any) => (b.xp_total || 0) - (a.xp_total || 0));

        const leaderboard = friendUsers.map((u: any, idx: number) => ({
          arenaRank: idx + 1,
          id: u.id,
          name: u.name,
          email: u.email,
          xp_total: u.xp_total || 0,
          isCurrentUser: u.id === currentUser.id,
        }));

        let friendRequests: any[] = [];
        try {
          friendRequests = typeof currentUser.friend_requests_json === 'string' ? JSON.parse(currentUser.friend_requests_json) : (currentUser.friendRequests || []);
        } catch (_) {}

        const pendingRequests = friendRequests
          .filter((r: any) => r.status === 'pending')
          .map((r: any) => ({
            requesterId: r.requesterId,
            name: r.requesterName,
            email: r.requesterEmail,
            xp_total: r.requesterXp || 0,
            created_at: r.created_at,
          }));

        return NextResponse.json({
          friendsLeaderboard: leaderboard,
          pendingRequests,
          inviteCode: currentUser.id.slice(0, 8).toUpperCase(),
          totalFriends: friendsIds.length,
        });
      }
    } catch (d1Err) {
      console.warn('[friends GET] D1 fallback:', d1Err);
    }

    // 2. Memory Mode Fallback
    const { isMemoryMode } = await dbConnect();
    if (isMemoryMode) {
      const db = readSharedDb();
      const currentUser = (db.users || []).find((u) => u._id === auth.userId || u.id === auth.userId);
      if (!currentUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const friendsIds: string[] = currentUser.friends || [];

      if (searchQuery) {
        const matches = (db.users || [])
          .filter((u) => u._id !== currentUser._id)
          .filter((u) => 
            (u.name || '').toLowerCase().includes(searchQuery) || 
            (u.email || '').toLowerCase().includes(searchQuery)
          )
          .map((u) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            xp_total: u.xp_total || 0,
            isAlreadyFriend: friendsIds.includes(u._id),
          }));

        return NextResponse.json({ searchResults: matches.slice(0, 10) });
      }

      const groupIds = new Set<string>([currentUser._id, ...friendsIds]);
      (db.users || []).forEach((u) => {
        if (groupIds.has(u._id)) {
          (u.friends || []).forEach((fid: string) => groupIds.add(fid));
        }
      });

      const allFriendsObjs = (db.users || [])
        .filter((u) => groupIds.has(u._id))
        .sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0));

      const leaderboard = allFriendsObjs.map((u, idx) => ({
        arenaRank: idx + 1,
        id: u._id,
        name: u.name,
        email: u.email,
        xp_total: u.xp_total || 0,
        isCurrentUser: u._id === currentUser._id,
      }));

      const pendingRequests = (currentUser.friendRequests || [])
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => ({
          requesterId: r.requesterId,
          name: r.requesterName,
          email: r.requesterEmail,
          xp_total: r.requesterXp || 0,
          created_at: r.created_at,
        }));

      return NextResponse.json({
        friendsLeaderboard: leaderboard,
        pendingRequests,
        inviteCode: (currentUser._id || currentUser.id).slice(0, 8).toUpperCase(),
        totalFriends: groupIds.size - 1,
      });
    }

    // 3. Mongoose mode (if connected)
    try {
      const currentUser = await User.findById(auth.userId);
      if (!currentUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const friendsIds: string[] = currentUser.friends || [];

      if (searchQuery) {
        const matches = await User.find({
          _id: { $ne: currentUser._id },
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } },
          ],
        })
          .select('name email xp_total')
          .limit(10);

        const searchResults = matches.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          xp_total: u.xp_total || 0,
          isAlreadyFriend: friendsIds.includes(u._id.toString()),
        }));

        return NextResponse.json({ searchResults });
      }

      const groupIds = new Set<string>([currentUser._id.toString(), ...friendsIds]);
      const directFriendsObjs = await User.find({ _id: { $in: Array.from(groupIds) } }).select('friends');
      directFriendsObjs.forEach((u) => {
        (u.friends || []).forEach((fid: string) => groupIds.add(fid));
      });

      const friendUsers = await User.find({ _id: { $in: Array.from(groupIds) } })
        .sort({ xp_total: -1 })
        .select('name email xp_total');

      const leaderboard = friendUsers.map((u, idx) => ({
        arenaRank: idx + 1,
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        xp_total: u.xp_total || 0,
        isCurrentUser: u._id.toString() === currentUser._id.toString(),
      }));

      const pendingRequests = (currentUser.friendRequests || [])
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => ({
          requesterId: r.requesterId,
          name: r.requesterName,
          email: r.requesterEmail,
          xp_total: r.requesterXp || 0,
          created_at: r.created_at,
        }));

      return NextResponse.json({
        friendsLeaderboard: leaderboard,
        pendingRequests,
        inviteCode: currentUser._id.toString().slice(0, 8).toUpperCase(),
        totalFriends: friendsIds.length,
      });
    } catch (_) {}

    return NextResponse.json({ friendsLeaderboard: [], pendingRequests: [], inviteCode: 'EXAMIZO1', totalFriends: 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add a friend by friendId or email
export async function POST(request: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const friendIdToAdd = body.friendId;

    if (!friendIdToAdd) {
      return NextResponse.json({ error: 'friendId is required' }, { status: 400 });
    }

    if (friendIdToAdd === auth.userId) {
      return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 });
    }

    // 1. Try D1 first
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE id = ? OR email = ? LIMIT 1', [String(auth.userId), String(auth.email).toLowerCase()]);
      if (d1Users && d1Users.length > 0) {
        const currentUser = d1Users[0];
        const targetFriendRes = await queryD1('SELECT * FROM users WHERE id = ? OR LOWER(email) = ? LIMIT 1', [friendIdToAdd, String(friendIdToAdd).toLowerCase()]);

        if (!targetFriendRes || targetFriendRes.length === 0) {
          return NextResponse.json({ error: 'Registered student not found' }, { status: 404 });
        }

        const targetFriend = targetFriendRes[0];
        let currentFriends: string[] = [];
        try {
          currentFriends = typeof currentUser.friends_json === 'string' ? JSON.parse(currentUser.friends_json) : [];
        } catch (_) {}

        if (!currentFriends.includes(targetFriend.id)) {
          currentFriends.push(targetFriend.id);
          await executeD1('UPDATE users SET friends_json = ? WHERE id = ?', [JSON.stringify(currentFriends), currentUser.id]);
        }

        return NextResponse.json({ success: true, message: `Added ${targetFriend.name} to your friends leaderboard!` });
      }
    } catch (d1Err) {
      console.warn('[friends POST] D1 fallback:', d1Err);
    }

    // 2. Memory Mode Fallback
    const { isMemoryMode } = await dbConnect();
    if (isMemoryMode) {
      const db = readSharedDb();
      const userIndex = (db.users || []).findIndex((u) => u._id === auth.userId);
      if (userIndex === -1) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const targetFriend = (db.users || []).find((u) => u._id === friendIdToAdd || u.email === friendIdToAdd);
      if (!targetFriend) {
        return NextResponse.json({ error: 'Registered student not found' }, { status: 404 });
      }

      const friends: string[] = db.users[userIndex].friends || [];
      if (!friends.includes(targetFriend._id)) {
        friends.push(targetFriend._id);
        db.users[userIndex].friends = friends;
        writeSharedDb(db);
      }

      return NextResponse.json({ success: true, message: `Added ${targetFriend.name} to your friends leaderboard!` });
    }

    // 3. Mongoose mode
    try {
      const currentUser = await User.findById(auth.userId);
      if (!currentUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const targetFriend = await User.findOne({
        $or: [{ _id: friendIdToAdd }, { email: friendIdToAdd }],
      });

      if (!targetFriend) {
        return NextResponse.json({ error: 'Registered student not found' }, { status: 404 });
      }

      const currentFriends: string[] = currentUser.friends || [];
      if (!currentFriends.includes(targetFriend._id.toString())) {
        currentFriends.push(targetFriend._id.toString());
        currentUser.friends = currentFriends;
        await currentUser.save();
      }

      return NextResponse.json({ success: true, message: `Added ${targetFriend.name} to your friends leaderboard!` });
    } catch (_) {}

    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a friend from friends leaderboard
export async function DELETE(request: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const friendIdToRemove = searchParams.get('friendId');

    if (!friendIdToRemove) {
      return NextResponse.json({ error: 'friendId is required' }, { status: 400 });
    }

    // 1. Try D1 first
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE id = ? OR email = ? LIMIT 1', [String(auth.userId), String(auth.email).toLowerCase()]);
      if (d1Users && d1Users.length > 0) {
        const currentUser = d1Users[0];
        let friends: string[] = [];
        try {
          friends = typeof currentUser.friends_json === 'string' ? JSON.parse(currentUser.friends_json) : [];
        } catch (_) {}

        friends = friends.filter((id: string) => id !== friendIdToRemove);
        await executeD1('UPDATE users SET friends_json = ? WHERE id = ?', [JSON.stringify(friends), currentUser.id]);

        return NextResponse.json({ success: true });
      }
    } catch (d1Err) {
      console.warn('[friends DELETE] D1 fallback:', d1Err);
    }

    // 2. Memory Mode
    const { isMemoryMode } = await dbConnect();
    if (isMemoryMode) {
      const db = readSharedDb();
      const userIndex = (db.users || []).findIndex((u) => u._id === auth.userId);
      if (userIndex !== -1 && db.users[userIndex].friends) {
        db.users[userIndex].friends = db.users[userIndex].friends.filter((id: string) => id !== friendIdToRemove);
        writeSharedDb(db);
      }
      return NextResponse.json({ success: true });
    }

    // 3. Mongoose mode
    try {
      const currentUser = await User.findById(auth.userId);
      if (currentUser && currentUser.friends) {
        currentUser.friends = currentUser.friends.filter((id: string) => id !== friendIdToRemove);
        await currentUser.save();
      }
      return NextResponse.json({ success: true });
    } catch (_) {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
