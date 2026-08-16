import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User } from '@/lib/models';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { queryD1, executeD1 } from '@/lib/d1';

// POST: Host accepts or declines a join request from another student
export async function POST(request: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requesterId, action } = await request.json();
    if (!requesterId || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'requesterId and valid action (accept/decline) are required' }, { status: 400 });
    }

    // 1. Try D1 first
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE id = ? OR email = ? LIMIT 1', [String(auth.userId), String(auth.email).toLowerCase()]);
      if (d1Users && d1Users.length > 0) {
        const hostUser = d1Users[0];
        const reqUserRes = await queryD1('SELECT * FROM users WHERE id = ? LIMIT 1', [requesterId]);
        const requesterUser = reqUserRes && reqUserRes.length > 0 ? reqUserRes[0] : null;

        let hostRequests: any[] = [];
        try {
          hostRequests = typeof hostUser.friend_requests_json === 'string' ? JSON.parse(hostUser.friend_requests_json) : [];
        } catch (_) {}

        // Remove request
        hostRequests = hostRequests.filter((r: any) => r.requesterId !== requesterId);
        await executeD1('UPDATE users SET friend_requests_json = ? WHERE id = ?', [JSON.stringify(hostRequests), hostUser.id]);

        if (action === 'accept') {
          let hostFriends: string[] = [];
          try {
            hostFriends = typeof hostUser.friends_json === 'string' ? JSON.parse(hostUser.friends_json) : [];
          } catch (_) {}

          let reqFriends: string[] = [];
          if (requesterUser) {
            try {
              reqFriends = typeof requesterUser.friends_json === 'string' ? JSON.parse(requesterUser.friends_json) : [];
            } catch (_) {}
          }

          const currentArenaMembers = new Set<string>([hostUser.id, ...hostFriends, requesterId, ...reqFriends]);
          const arenaMembersList = Array.from(currentArenaMembers);

          for (const memberId of arenaMembersList) {
            const memberFriends = arenaMembersList.filter((id) => id !== memberId);
            await executeD1('UPDATE users SET friends_json = ? WHERE id = ?', [JSON.stringify(memberFriends), memberId]);
          }
        }

        const requesterName = requesterUser ? requesterUser.name : 'Student';
        return NextResponse.json({
          success: true,
          message: action === 'accept' ? `Accepted ${requesterName}'s join request!` : `Declined join request`,
        });
      }
    } catch (d1Err) {
      console.warn('[friends/request/action POST] D1 fallback:', d1Err);
    }

    // 2. Memory Mode Fallback
    const { isMemoryMode } = await dbConnect();
    if (isMemoryMode) {
      const db = readSharedDb();
      const hostIndex = db.users.findIndex((u: any) => u._id === auth.userId || u.id === auth.userId);
      const requesterIndex = db.users.findIndex((u: any) => u._id === requesterId || u.id === requesterId);

      if (hostIndex === -1) {
        return NextResponse.json({ error: 'Host user not found' }, { status: 404 });
      }

      const hostUser = db.users[hostIndex];
      let hostRequests: any[] = hostUser.friendRequests || [];

      // Remove request from pending requests list
      db.users[hostIndex].friendRequests = hostRequests.filter((r) => r.requesterId !== requesterId);

      if (action === 'accept') {
        // Collect all existing members of host's arena group
        const currentArenaMembers = new Set<string>([hostUser._id, ...(hostUser.friends || []), requesterId]);

        if (requesterIndex !== -1 && db.users[requesterIndex].friends) {
          (db.users[requesterIndex].friends || []).forEach((fid: string) => currentArenaMembers.add(fid));
        }

        const arenaMembersList = Array.from(currentArenaMembers);

        // Update all members in this arena group so everyone has everyone else in their friends array
        arenaMembersList.forEach((memberId) => {
          const uIdx = db.users.findIndex((u: any) => u._id === memberId || u.id === memberId);
          if (uIdx !== -1) {
            const memberFriends = arenaMembersList.filter((id) => id !== memberId);
            db.users[uIdx].friends = Array.from(new Set([...(db.users[uIdx].friends || []), ...memberFriends]));
          }
        });
      }

      writeSharedDb(db);

      const requesterName = requesterIndex !== -1 ? db.users[requesterIndex].name : 'Student';
      return NextResponse.json({
        success: true,
        message: action === 'accept' ? `Accepted ${requesterName}'s join request!` : `Declined join request`,
      });
    }

    // 3. Mongoose mode
    try {
      const hostUser = await User.findById(auth.userId);
      const requesterUser = await User.findById(requesterId);

      if (!hostUser) {
        return NextResponse.json({ error: 'Host user not found' }, { status: 404 });
      }

      // Filter out the request
      hostUser.friendRequests = (hostUser.friendRequests || []).filter(
        (r) => r.requesterId !== requesterId
      );

      if (action === 'accept') {
        const currentArenaMembers = new Set<string>([
          hostUser._id.toString(),
          ...(hostUser.friends || []),
          requesterId,
        ]);

        if (requesterUser && requesterUser.friends) {
          requesterUser.friends.forEach((fid: string) => currentArenaMembers.add(fid));
        }

        const arenaMembersList = Array.from(currentArenaMembers);

        await User.updateMany(
          { _id: { $in: arenaMembersList } },
          { $addToSet: { friends: { $each: arenaMembersList } } }
        );

        for (const mId of arenaMembersList) {
          await User.updateOne({ _id: mId }, { $pull: { friends: mId } });
        }
      }

      await hostUser.save();

      const requesterName = requesterUser ? requesterUser.name : 'Student';
      return NextResponse.json({
        success: true,
        message: action === 'accept' ? `Accepted ${requesterName}'s join request!` : `Declined join request`,
      });
    } catch (_) {}

    return NextResponse.json({ error: 'Host user not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
