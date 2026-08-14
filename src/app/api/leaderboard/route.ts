import { NextResponse } from 'next/server';
import { User } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';

export async function GET() {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      const res = NextResponse.json({ error: 'User deleted or not found' }, { status: 401 });
      res.cookies.set('student_token', '', { httpOnly: true, maxAge: 0, path: '/' });
      return res;
    }

    const { user, isMemoryMode } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ error: 'No course locked' }, { status: 400 });
    }

    if (isMemoryMode) {
      const db = readSharedDb();
      const students = (db.users || [])
        .filter((u: any) => String(u.locked_course_id) === String(user.locked_course_id) && u.status === 'Active')
        .sort((a: any, b: any) => (b.xp_total || 0) - (a.xp_total || 0));

      let userRank = 1;
      const formattedList = students.map((s: any, idx: number) => {
        const isSelf = String(s._id) === String(user._id);
        if (isSelf) {
          userRank = idx + 1;
        }
        return {
          id: String(s._id),
          user_id: String(s._id),
          rank: idx + 1,
          name: s.name,
          xp_total: s.xp_total || 0,
          isSelf,
          isCurrentUser: isSelf,
        };
      });

      return NextResponse.json({
        leaderboard: formattedList.slice(0, 20),
        userRank: {
          user_id: String(user._id),
          rank: userRank,
          name: user.name,
          xp_total: user.xp_total || 0,
        },
      });
    }

    // Mongoose mode
    const students = await User.find({
      locked_course_id: user.locked_course_id,
      status: 'Active',
    })
      .sort({ xp_total: -1, created_at: 1 })
      .select('name xp_total created_at');

    let userRank = 1;
    const formattedList = students.map((s, idx) => {
      const isSelf = s._id.toString() === user._id.toString();
      if (isSelf) {
        userRank = idx + 1;
      }
      return {
        id: s._id.toString(),
        user_id: s._id.toString(),
        rank: idx + 1,
        name: s.name,
        xp_total: s.xp_total || 0,
        isSelf,
        isCurrentUser: isSelf,
      };
    });

    return NextResponse.json({
      leaderboard: formattedList.slice(0, 20),
      userRank: {
        user_id: user._id.toString(),
        rank: userRank,
        name: user.name,
        xp_total: user.xp_total || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

