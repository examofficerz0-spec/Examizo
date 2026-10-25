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

      const allActiveUsers = (await queryD1(
        "SELECT id, name, nickname, full_name, locked_course_id, xp_total, created_at FROM users WHERE status = 'Active'"
      )) || [];

      let allActiveSubProfiles: any[] = [];
      try {
        allActiveSubProfiles = (await queryD1(
          "SELECT id, name, nickname, full_name, locked_course_id, xp_total, created_at FROM sub_profiles WHERE status = 'Active'"
        )) || [];
      } catch (_) {}

      // Merge into a map by id so sub-profiles and users are both represented
      const studentMap = new Map<string, any>();
      allActiveUsers.forEach((u: any) => {
        studentMap.set(String(u.id), u);
      });
      allActiveSubProfiles.forEach((sp: any) => {
        const id = String(sp.id);
        if (!studentMap.has(id)) {
          studentMap.set(id, sp);
        } else {
          const ex = studentMap.get(id);
          studentMap.set(id, {
            ...ex,
            ...sp,
            locked_course_id: sp.locked_course_id || ex.locked_course_id,
            xp_total: sp.xp_total ?? ex.xp_total,
          });
        }
      });

      // Always ensure current user / active sub-profile is in the studentMap
      if (!studentMap.has(currentUserId)) {
        studentMap.set(currentUserId, {
          id: currentUserId,
          name: currentDisplayName,
          full_name: user.full_name || user.name,
          nickname: user.nickname || null,
          locked_course_id: user.locked_course_id,
          xp_total: Number(user.xp_total || 0),
          created_at: user.created_at || new Date().toISOString(),
        });
      } else {
        const cur = studentMap.get(currentUserId);
        studentMap.set(currentUserId, {
          ...cur,
          locked_course_id: user.locked_course_id || cur.locked_course_id,
          xp_total: Number(user.xp_total ?? cur.xp_total ?? 0),
          nickname: user.nickname || cur.nickname,
        });
      }

      const allCombinedStudents = Array.from(studentMap.values());
      const cohortStudents = allCombinedStudents
        .filter((u: any) => isUserInCohort(u.locked_course_id, cohort, d1Courses))
        .sort((a: any, b: any) => {
          const xpDiff = Number(b.xp_total || 0) - Number(a.xp_total || 0);
          if (xpDiff !== 0) return xpDiff;
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });

      let userRank: number | null = null;
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

      // If current user is not in the list, place them at the cohort rank
      if (userRank === null) {
        userRank = cohortStudents.length > 0 ? cohortStudents.length : 1;
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
    } catch (d1Err) {
      console.warn('[api/leaderboard] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const fallbackCourses = db.courses || [];
    const cohort = resolveLeaderboardCohort(user.locked_course_id, fallbackCourses);

    const memStudentMap = new Map<string, any>();
    (db.users || []).forEach((u: any) => {
      if (u.status === 'Active') {
        memStudentMap.set(String(u._id || u.id), u);
      }
    });
    (db.sub_profiles || []).forEach((sp: any) => {
      if (sp.status === 'Active') {
        const id = String(sp._id || sp.id);
        if (!memStudentMap.has(id)) {
          memStudentMap.set(id, sp);
        } else {
          const ex = memStudentMap.get(id);
          memStudentMap.set(id, {
            ...ex,
            ...sp,
            locked_course_id: sp.locked_course_id || ex.locked_course_id,
            xp_total: sp.xp_total ?? ex.xp_total,
          });
        }
      }
    });

    if (!memStudentMap.has(currentUserId)) {
      memStudentMap.set(currentUserId, {
        id: currentUserId,
        _id: currentUserId,
        name: currentDisplayName,
        full_name: user.full_name || user.name,
        nickname: user.nickname || null,
        locked_course_id: user.locked_course_id,
        xp_total: Number(user.xp_total || 0),
        created_at: user.created_at || new Date().toISOString(),
      });
    }

    const allMemStudents = Array.from(memStudentMap.values());
    const cohortStudents = allMemStudents
      .filter((u: any) => isUserInCohort(u.locked_course_id, cohort, fallbackCourses))
      .sort((a: any, b: any) => {
        const xpDiff = Number(b.xp_total || 0) - Number(a.xp_total || 0);
        if (xpDiff !== 0) return xpDiff;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

    let userRank: number | null = null;
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

    if (userRank === null) {
      userRank = cohortStudents.length > 0 ? cohortStudents.length : 1;
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
