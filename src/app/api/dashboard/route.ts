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
    const rawCourseId = user.locked_course_id || auth.lockedCourseId;

    if (!rawCourseId || !String(rawCourseId).trim()) {
      return NextResponse.json({ needsCourseSelection: true }, { status: 200 });
    }

    const courseId = typeof rawCourseId === 'object' && rawCourseId?._id 
      ? String(rawCourseId._id) 
      : String(rawCourseId).trim();

    const userId = String(user._id || user.id || auth.userId);

    // 1. Primary: Cloudflare D1
    try {
      const d1Courses = await queryD1('SELECT * FROM courses');
      const courseRow = (d1Courses || []).find(
        (c: any) => String(c.id) === courseId || String(c._id) === courseId || String(c.name).toLowerCase() === courseId.toLowerCase()
      );

      let subjects: string[] = [];
      if (courseRow) {
        try {
          subjects = typeof courseRow.subjects_json === 'string' ? JSON.parse(courseRow.subjects_json) : (courseRow.subjects_json || []);
        } catch (e) {
          subjects = ['Physics', 'Chemistry', 'Mathematics'];
        }
      }

      const lockedCourse = {
        _id: courseRow ? courseRow.id : courseId,
        id: courseRow ? courseRow.id : courseId,
        name: courseRow ? courseRow.name : 'Target Course Track',
        description: courseRow ? courseRow.description : '',
        category: courseRow ? courseRow.category : 'Competitive Exams',
        board: courseRow ? courseRow.board : 'CBSE',
        curriculum: courseRow ? courseRow.curriculum : '',
        subjects,
      };

      const courseDbId = courseRow ? courseRow.id : courseId;
      const d1Qs = await queryD1('SELECT * FROM questions WHERE course_id = ? AND (is_active IS NULL OR is_active != 0)', [courseDbId]);
      const d1Attempts = await queryD1('SELECT * FROM attempts WHERE (student_id = ? OR student_id = ?)', [userId, String(auth.email || '')]);
      const d1MockTests = await queryD1('SELECT * FROM mock_tests WHERE course_id = ? AND (is_active IS NULL OR is_active != 0) LIMIT 2', [courseDbId]);
      const d1Leaderboard = await queryD1(
        "SELECT id, name, xp_total FROM users WHERE locked_course_id = ? AND status != 'Deleted' ORDER BY xp_total DESC LIMIT 10",
        [courseDbId]
      );

      const formattedQs = (d1Qs || []).map((q: any) => {
        let opts: string[] = [];
        try {
          opts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []);
        } catch (e) {
          opts = [];
        }
        return {
          _id: q.id,
          id: q.id,
          question_text: q.question_text,
          options: opts,
          correct_option: Number(q.correct_option || 0),
          explanation: q.explanation || '',
          detailed_explanation: q.detailed_explanation || '',
          topic_tag: q.topic_tag || 'General',
        };
      });

      const formattedAttempts = (d1Attempts || []).map((a: any) => {
        let responses: any[] = [];
        try {
          responses = typeof a.responses_json === 'string' ? JSON.parse(a.responses_json) : (a.responses_json || []);
        } catch (e) {
          responses = [];
        }
        return {
          _id: a.id,
          id: a.id,
          student_id: a.student_id,
          course_id: a.course_id,
          test_id: a.test_id,
          type: a.type,
          topic_tag: a.topic_tag,
          responses,
          score: a.score,
          accuracy: a.accuracy,
          time_spent_seconds: a.time_spent_seconds,
          submitted_at: a.submitted_at || a.started_at,
        };
      });

      const attemptedQIds = new Set<string>();
      formattedAttempts.forEach((a) => {
        (a.responses || []).forEach((r: any) => attemptedQIds.add(String(r.question_id)));
      });

      const incorrectLogMap = new Map<string, any>();
      formattedAttempts.forEach((a) => {
        (a.responses || []).forEach((r: any) => {
          const qId = String(r.question_id);
          const q = formattedQs.find((item: any) => String(item.id) === qId);
          if (q) {
            const isIncorrect = r.is_correct === false || (r.selected_option !== undefined && r.selected_option !== null && r.selected_option !== q.correct_option);
            if (isIncorrect && !incorrectLogMap.has(qId)) {
              incorrectLogMap.set(qId, {
                _id: q.id,
                question_text: q.question_text,
                options: q.options || [],
                userSelectedOption: r.selected_option,
                correctOption: q.correct_option,
                explanation: q.explanation || '',
                detailed_explanation: q.detailed_explanation || '',
                topic_tag: q.topic_tag || a.topic_tag || 'General',
                attemptedAt: a.submitted_at || new Date().toISOString(),
                attemptType: a.type || 'practice',
              });
            }
          }
        });
      });
      const incorrectLog = Array.from(incorrectLogMap.values());

      const topicSet = new Set<string>();
      formattedQs.forEach((q: any) => {
        if (q.topic_tag) topicSet.add(q.topic_tag.trim());
      });

      const topicsList = Array.from(topicSet);
      let totalTopicCompletionSum = 0;

      topicsList.forEach((topicName) => {
        const topicQuestions = formattedQs.filter(
          (q: any) =>
            (q.topic_tag || '').toLowerCase().includes(topicName.toLowerCase()) ||
            topicName.toLowerCase().includes((q.topic_tag || '').toLowerCase())
        );

        if (topicQuestions.length > 0) {
          let attemptedInTopic = 0;
          topicQuestions.forEach((q: any) => {
            if (attemptedQIds.has(String(q.id))) {
              attemptedInTopic++;
            }
          });
          totalTopicCompletionSum += Math.min(1, attemptedInTopic / topicQuestions.length);
        }
      });

      const progressPercent = topicsList.length > 0
        ? Math.min(100, Math.max(0, Math.round((totalTopicCompletionSum / topicsList.length) * 100)))
        : 0;

      const mockTests = (d1MockTests || []).map((mt: any) => {
        let qIds: string[] = [];
        try {
          qIds = typeof mt.question_ids_json === 'string' ? JSON.parse(mt.question_ids_json) : (mt.question_ids_json || []);
        } catch (e) {
          qIds = [];
        }
        const userTestAttempts = formattedAttempts.filter((a) => String(a.test_id) === String(mt.id));
        const highestScore = userTestAttempts.reduce((max, a) => Math.max(max, a.score || 0), 0);
        return {
          id: mt.id,
          _id: mt.id,
          title: mt.title,
          type: mt.type || 'full',
          duration: mt.duration_minutes || 180,
          cutoffMarks: mt.cutoff_marks || 120,
          totalQuestions: qIds.length,
          attemptsCount: userTestAttempts.length,
          highestScore,
          isAttempted: userTestAttempts.length > 0,
        };
      });

      const leaderboardStudents = (d1Leaderboard || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        xp: u.xp_total || 0,
      }));

      let rank = 1;
      for (let i = 0; i < leaderboardStudents.length; i++) {
        if (String(leaderboardStudents[i].id) === userId) {
          rank = i + 1;
          break;
        }
      }

      return NextResponse.json({
        user: {
          name: user.name,
          email: user.email,
          xp_total: user.xp_total || 0,
          lockedCourse,
          progressPercent,
          rank: rank || 1,
        },
        mockTests,
        topLeaderboard: leaderboardStudents.slice(0, 3),
        incorrectLog,
      });
    } catch (d1Err) {
      console.warn('[api/dashboard] D1 query error, falling back to sharedDb:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const lockedCourse = (db.courses || []).find((c) => String(c._id) === courseId || String(c.id) === courseId) || {
      _id: courseId,
      id: courseId,
      name: 'Target Course Track',
      category: 'Competitive Exams',
    };

    const attempts = (db.attempts || []).filter((a) => String(a.student_id) === userId && String(a.course_id) === courseId);
    const courseQs = (db.questions || []).filter((q) => String(q.course_id) === courseId && q.is_active !== false);

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        xp_total: user.xp_total || 0,
        lockedCourse,
        progressPercent: 0,
        rank: 1,
      },
      mockTests: [],
      topLeaderboard: [],
      incorrectLog: [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal dashboard error' }, { status: 500 });
  }
}
