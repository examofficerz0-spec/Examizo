import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const { user } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ error: 'No course locked' }, { status: 400 });
    }

    const currentUserId = String(user._id || user.id || auth.userId);

    // 1. Primary: Cloudflare D1
    try {
      const d1Students = await queryD1(
        "SELECT id, name, xp_total, created_at FROM users WHERE locked_course_id = ? AND status = 'Active' ORDER BY xp_total DESC, created_at ASC",
        [user.locked_course_id]
      );

      if (d1Students && d1Students.length > 0) {
        let userRank = 1;
        const formattedList = d1Students.map((s: any, idx: number) => {
          const isSelf = String(s.id) === currentUserId;
          if (isSelf) {
            userRank = idx + 1;
          }
          return {
            id: s.id,
            user_id: s.id,
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
            user_id: currentUserId,
            rank: userRank,
            name: user.name,
            xp_total: user.xp_total || 0,
          },
        });
      }
    } catch (d1Err) {
      console.warn('[api/leaderboard] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const students = (db.users || [])
      .filter((u: any) => String(u.locked_course_id) === String(user.locked_course_id) && u.status === 'Active')
      .sort((a: any, b: any) => (b.xp_total || 0) - (a.xp_total || 0));

    let userRank = 1;
    const formattedList = students.map((s: any, idx: number) => {
      const isSelf = String(s._id || s.id) === currentUserId;
      if (isSelf) {
        userRank = idx + 1;
      }
      return {
        id: String(s._id || s.id),
        user_id: String(s._id || s.id),
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
        user_id: currentUserId,
        rank: userRank,
        name: user.name,
        xp_total: user.xp_total || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
