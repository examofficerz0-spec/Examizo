import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1 } from '@/lib/d1';
import { resolveLeaderboardCohort, isUserInCohort } from '@/lib/cohortMatcher';

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
      return NextResponse.json({ error: 'User deleted or not found' }, { status: 401 });
    }

    const { user } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ leaderboard: [], userRank: null, needsCourseSelection: true }, { status: 200 });
    }

    const currentUserId = String(user._id || user.id || auth.userId);
    const currentDisplayName = user.nickname && String(user.nickname).trim() ? String(user.nickname).trim() : (user.full_name || user.name);

    // 1. Primary: Cloudflare D1
    try {
      const d1Courses = (await queryD1('SELECT id, name, category, board, curriculum FROM courses')) || [];
      const cohort = resolveLeaderboardCohort(user.locked_course_id, d1Courses);

      const allActiveUsers = await queryD1(
        "SELECT id, name, nickname, full_name, locked_course_id, xp_total, created_at FROM users WHERE status = 'Active'"
      );

      const cohortStudents = (allActiveUsers || [])
        .filter((u: any) => isUserInCohort(u.locked_course_id, cohort, d1Courses))
        .sort((a: any, b: any) => {
          const xpDiff = Number(b.xp_total || 0) - Number(a.xp_total || 0);
          if (xpDiff !== 0) return xpDiff;
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });

      if (cohortStudents.length > 0) {
        let userRank = 1;
        const formattedList = cohortStudents.map((s: any, idx: number) => {
          const isSelf = String(s.id) === currentUserId;
          if (isSelf) {
            userRank = idx + 1;
          }
          const sName = s.nickname && String(s.nickname).trim() ? String(s.nickname).trim() : (s.full_name || s.name);
          return {
            id: s.id,
            user_id: s.id,
            rank: idx + 1,
            name: sName,
            fullName: s.full_name || s.name,
            nickname: s.nickname || null,
            xp_total: Number(s.xp_total || 0),
            isSelf,
            isCurrentUser: isSelf,
          };
        });

        // If current user is not in the list (e.g. newly created profile), find their rank position
        if (!cohortStudents.some((s: any) => String(s.id) === currentUserId)) {
          const selfXp = Number(user.xp_total || 0);
          const higherCount = cohortStudents.filter((s: any) => Number(s.xp_total || 0) > selfXp).length;
          userRank = higherCount + 1;
        }

        return NextResponse.json({
          leaderboard: formattedList.slice(0, 50),
          userRank: {
            user_id: currentUserId,
            rank: userRank,
            name: currentDisplayName,
            xp_total: Number(user.xp_total || 0),
          },
          level: {
            type: cohort.type,
            levelId: cohort.levelId,
            levelLabel: cohort.levelLabel,
            levelCategory: cohort.levelCategory,
            headline: cohort.headline,
            badgeText: cohort.badgeText,
            totalStudentsInLevel: cohortStudents.length,
          },
        });
      }
    } catch (d1Err) {
      console.warn('[api/leaderboard] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const fallbackCourses = db.courses || [];
    const cohort = resolveLeaderboardCohort(user.locked_course_id, fallbackCourses);

    const cohortStudents = (db.users || [])
      .filter((u: any) => u.status === 'Active' && isUserInCohort(u.locked_course_id, cohort, fallbackCourses))
      .sort((a: any, b: any) => {
        const xpDiff = Number(b.xp_total || 0) - Number(a.xp_total || 0);
        if (xpDiff !== 0) return xpDiff;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

    let userRank = 1;
    const formattedList = cohortStudents.map((s: any, idx: number) => {
      const isSelf = String(s._id || s.id) === currentUserId;
      if (isSelf) {
        userRank = idx + 1;
      }
      const sName = s.nickname && String(s.nickname).trim() ? String(s.nickname).trim() : (s.full_name || s.name);
      return {
        id: String(s._id || s.id),
        user_id: String(s._id || s.id),
        rank: idx + 1,
        name: sName,
        fullName: s.full_name || s.name,
        nickname: s.nickname || null,
        xp_total: Number(s.xp_total || 0),
        isSelf,
        isCurrentUser: isSelf,
      };
    });

    if (!cohortStudents.some((s: any) => String(s._id || s.id) === currentUserId)) {
      const selfXp = Number(user.xp_total || 0);
      const higherCount = cohortStudents.filter((s: any) => Number(s.xp_total || 0) > selfXp).length;
      userRank = higherCount + 1;
    }

    return NextResponse.json({
      leaderboard: formattedList.slice(0, 50),
      userRank: {
        user_id: currentUserId,
        rank: userRank,
        name: currentDisplayName,
        xp_total: Number(user.xp_total || 0),
      },
      level: {
        type: cohort.type,
        levelId: cohort.levelId,
        levelLabel: cohort.levelLabel,
        levelCategory: cohort.levelCategory,
        headline: cohort.headline,
        badgeText: cohort.badgeText,
        totalStudentsInLevel: cohortStudents.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
