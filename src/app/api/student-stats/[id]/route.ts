import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { queryD1 } from '@/lib/d1';
import { resolveLeaderboardCohort, isUserInCohort } from '@/lib/cohortMatcher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const studentId = params.id;
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    // 1. Primary: Cloudflare D1
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE id = ? OR email = ? LIMIT 1', [studentId, studentId]);
      if (d1Users && d1Users.length > 0) {
        const u = d1Users[0];
        const userCourseId = u.locked_course_id || null;
        let courseName = 'Unassigned Track';

        const d1Courses = (await queryD1('SELECT id, name, category, board, curriculum FROM courses')) || [];
        const matchedCourse = d1Courses.find((c: any) => String(c.id) === String(userCourseId));
        if (matchedCourse) courseName = matchedCourse.name;

        const cohort = resolveLeaderboardCohort(matchedCourse || userCourseId, d1Courses);
        const allActiveUsers = await queryD1(
          "SELECT id, xp_total, locked_course_id, created_at FROM users WHERE status != 'Deleted'"
        );
        const cohortStudents = (allActiveUsers || [])
          .filter((usr: any) => isUserInCohort(usr.locked_course_id, cohort, d1Courses) && Number(usr.xp_total || 0) > 0)
          .sort((a: any, b: any) => {
            const xpDiff = Number(b.xp_total || 0) - Number(a.xp_total || 0);
            if (xpDiff !== 0) return xpDiff;
            return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          });

        const rankIndex = cohortStudents.findIndex((st: any) => String(st.id) === String(u.id));
        let rank = rankIndex !== -1 ? rankIndex + 1 : 0;
        if (rankIndex === -1) {
          const selfXp = Number(u.xp_total || 0);
          if (selfXp > 0) {
            const higherCount = cohortStudents.filter((st: any) => Number(st.xp_total || 0) > selfXp).length;
            rank = higherCount + 1;
          }
        }

        let d1Attempts = await queryD1(
          'SELECT * FROM attempts WHERE student_id = ? OR sub_profile_id = ? OR student_id = ? OR sub_profile_id = ? ORDER BY started_at DESC',
          [String(u.id), String(u.id), String(u.email || ''), String(u.account_email || '')]
        );
        d1Attempts = Array.isArray(d1Attempts) ? d1Attempts : [];

        try {
          const db = readSharedDb();
          const memAtts = (db.attempts || []).filter(
            (a: any) =>
              String(a.student_id) === String(u.id) ||
              String(a.sub_profile_id) === String(u.id) ||
              (u.email && String(a.student_id) === String(u.email)) ||
              (u.account_email && String(a.student_id) === String(u.account_email))
          );
          const existingIds = new Set(d1Attempts.map((item: any) => String(item.id)));
          memAtts.forEach((a: any) => {
            const attId = String(a._id || a.id);
            if (!existingIds.has(attId)) {
              d1Attempts.push({
                id: attId,
                student_id: a.student_id,
                sub_profile_id: a.sub_profile_id,
                course_id: a.course_id,
                test_id: a.test_id || a.mock_test_id,
                type: a.type,
                topic_tag: a.topic_tag,
                responses_json: typeof a.responses === 'string' ? a.responses : JSON.stringify(a.responses || a.responses_json || []),
                score: a.score,
                accuracy: a.accuracy,
                time_spent_seconds: a.time_spent_seconds,
                started_at: a.started_at || a.created_at,
                submitted_at: a.submitted_at || a.created_at,
              });
              existingIds.add(attId);
            }
          });
        } catch (_) {}

        let mockTests = await queryD1('SELECT * FROM mock_tests');
        if (!mockTests || mockTests.length === 0) {
          try {
            const db = readSharedDb();
            mockTests = (db.mockTests || []).map((m: any) => ({
              id: m._id || m.id,
              title: m.title,
              cutoff_marks: m.cutoff_marks,
              question_ids_json: JSON.stringify(m.question_ids || []),
            }));
          } catch (_) {}
        }

        // Course topics count
        const courseTopics = userCourseId
          ? await queryD1('SELECT DISTINCT topic_tag FROM questions WHERE course_id = ? AND (is_active IS NULL OR is_active != 0)', [userCourseId])
          : [];
        const totalModulesInCourse = courseTopics && courseTopics.length > 0 ? courseTopics.length : 10;

        let totalQuestionsAnswered = 0;
        let totalCorrectAnswers = 0;
        let totalTimeSpentSeconds = 0;
        const passedTopics = new Set<string>();
        const allAttemptedTopics = new Set<string>();

        (d1Attempts || []).forEach((a: any) => {
          let responses: any[] = [];
          try {
            responses = typeof a.responses_json === 'string' ? JSON.parse(a.responses_json) : (a.responses_json || []);
          } catch (_) {}

          totalQuestionsAnswered += responses.length;
          responses.forEach((r: any) => {
            if (r.is_correct) totalCorrectAnswers++;
          });

          totalTimeSpentSeconds += Number(a.time_spent_seconds || 0);

          if (a.topic_tag) {
            allAttemptedTopics.add(String(a.topic_tag).trim());
            if (Number(a.accuracy || 0) >= 50 || Number(a.score || 0) >= 5) {
              passedTopics.add(String(a.topic_tag).trim());
            }
          }
        });

        const mockAttempts = (d1Attempts || []).filter((a: any) => a.type === 'mock' || a.test_id);

        const mockTestHistory = mockAttempts
          .map((a: any, _idx: number, arr: any[]) => {
            const test = (mockTests || []).find((m: any) => String(m.id) === String(a.test_id));
            let qCount = 0;
            try {
              const qIds = typeof test?.question_ids_json === 'string' ? JSON.parse(test.question_ids_json) : (test?.question_ids_json || []);
              qCount = qIds.length;
            } catch (_) {}

            let responsesCount = 0;
            try {
              const resp = typeof a.responses_json === 'string' ? JSON.parse(a.responses_json) : (a.responses_json || []);
              responsesCount = resp.length;
            } catch (_) {}

            const totalMarks = qCount > 0
              ? qCount * 4
              : (test?.cutoff_marks ? test.cutoff_marks * 2 : (responsesCount > 0 ? responsesCount * 4 : 300));

            const percentage = totalMarks > 0 ? Math.round(((a.score || 0) / totalMarks) * 100) : 0;
            const timeSpentMinutes = Math.max(1, Math.round((a.time_spent_seconds || 0) / 60));

            const sameTestAttempts = arr
              .filter((item: any) => String(item.test_id || item.topic_tag) === String(a.test_id || a.topic_tag))
              .sort((x: any, y: any) => new Date(x.submitted_at || x.started_at || 0).getTime() - new Date(y.submitted_at || y.started_at || 0).getTime());
            const tryIndex = sameTestAttempts.findIndex((item: any) => item.id === a.id);
            const tryNumber = tryIndex !== -1 ? tryIndex + 1 : 1;

            return {
              id: a.id,
              title: a.topic_tag || test?.title || 'Full Mock Examination',
              score: a.score || 0,
              totalMarks,
              percentage,
              timeSpentSeconds: a.time_spent_seconds || 0,
              timeSpentMinutes,
              tryNumber,
              date: a.submitted_at || a.started_at || new Date().toISOString(),
            };
          })
          .sort((x: any, y: any) => new Date(y.date || 0).getTime() - new Date(x.date || 0).getTime());

        const modulesCompletedCount = passedTopics.size > 0 ? passedTopics.size : allAttemptedTopics.size;
        const moduleCompletionPercentage = totalModulesInCourse > 0
          ? Math.min(100, Math.round((modulesCompletedCount / totalModulesInCourse) * 100))
          : 0;

        const avgTimePerQuestionSeconds = totalQuestionsAnswered > 0
          ? Math.round(totalTimeSpentSeconds / totalQuestionsAnswered)
          : (d1Attempts.length > 0 ? Math.round(totalTimeSpentSeconds / d1Attempts.length) : 0);

        const overallAccuracyPercentage = totalQuestionsAnswered > 0
          ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
          : 0;

        return NextResponse.json({
          student: {
            id: u.id,
            name: u.name,
            email: u.email,
            xpTotal: u.xp_total || 0,
            status: u.status || 'Active',
            lockedCourseName: courseName,
            rank,
            totalStudentsInBatch: cohortStudents.length,
          },
          stats: {
            mockTestsAttempted: mockAttempts.length,
            mockTestHistory,
            modulesCompletedCount,
            totalModulesInCourse,
            moduleCompletionPercentage,
            avgTimePerQuestionSeconds,
            totalAttempts: d1Attempts.length,
            overallAccuracyPercentage,
          },
        });
      }
    } catch (e) {
      console.warn('[Student Stats GET D1 Error]:', e);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const user = (db.users || []).find((u) => String(u._id) === String(studentId) || String(u.id) === String(studentId));
    if (!user) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const fallbackCourses = db.courses || [];
    const course = fallbackCourses.find((c) => String(c._id) === String(user.locked_course_id) || String(c.id) === String(user.locked_course_id));
    const fallbackCohort = resolveLeaderboardCohort(course || user.locked_course_id, fallbackCourses);

    const cohortStudents = (db.users || [])
      .filter((u) => u.status !== 'Deleted' && isUserInCohort(u.locked_course_id, fallbackCohort, fallbackCourses) && Number(u.xp_total || 0) > 0)
      .sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0));

    const rankIndex = cohortStudents.findIndex((u) => String(u._id) === String(studentId) || String(u.id) === String(studentId));
    let rank = rankIndex !== -1 ? rankIndex + 1 : 0;
    if (rankIndex === -1) {
      const selfXp = Number(user.xp_total || 0);
      if (selfXp > 0) {
        const higherCount = cohortStudents.filter((st: any) => Number(st.xp_total || 0) > selfXp).length;
        rank = higherCount + 1;
      }
    }

    const attempts = (db.attempts || []).filter((a) => String(a.user_id || a.student_id) === String(studentId));

    const mockAttempts = attempts.filter((a) => a.mock_test_id || a.test_id || a.test_type === 'mock_test');
    const practiceAttempts = attempts.filter((a) => !a.mock_test_id && !a.test_id);

    const mockTestHistory = mockAttempts.map((a) => {
      const test = (db.mockTests || []).find((m) => String(m._id) === String(a.mock_test_id || a.test_id) || String(m.id) === String(a.mock_test_id || a.test_id));
      const totalMarks = a.total_marks || test?.total_marks || (test?.cutoff_marks ? test.cutoff_marks * 2 : 300);
      return {
        id: a._id || a.id,
        title: a.topic_tag || test?.title || 'Full Mock Examination',
        score: a.score || 0,
        totalMarks,
        percentage: totalMarks > 0 ? Math.round(((a.score || 0) / totalMarks) * 100) : 0,
        timeSpentSeconds: a.time_spent_seconds || 0,
        timeSpentMinutes: Math.round((a.time_spent_seconds || 0) / 60),
        date: a.submitted_at || a.completed_at || a.created_at || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      student: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        xpTotal: user.xp_total || 0,
        status: user.status || 'Active',
        lockedCourseName: course?.name || 'Unassigned Track',
        rank,
        totalStudentsInBatch: cohortStudents.length,
      },
      stats: {
        mockTestsAttempted: mockAttempts.length,
        mockTestHistory,
        modulesCompletedCount: practiceAttempts.length,
        totalModulesInCourse: 10,
        moduleCompletionPercentage: 50,
        avgTimePerQuestionSeconds: 30,
        totalAttempts: attempts.length,
        overallAccuracyPercentage: 75,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
