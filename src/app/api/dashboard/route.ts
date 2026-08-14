import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User, Question, MockTest, Attempt, Course } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { getEquivalentCourseIds } from '@/lib/courseMatcher';
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

    const { user, isMemoryMode } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ needsCourseSelection: true }, { status: 200 });
    }

    const rawCourseId = user.locked_course_id;
    const courseId = typeof rawCourseId === 'object' && rawCourseId?._id 
      ? String(rawCourseId._id) 
      : String(rawCourseId);

    const userId = String(user._id || user.id || auth.userId);

    // 1. Try D1 first
    try {
      const d1Courses = await queryD1('SELECT * FROM courses WHERE id = ? OR name = ? LIMIT 1', [courseId, courseId]);
      if (d1Courses && d1Courses.length > 0) {
        const courseRow = d1Courses[0];
        let subjects: string[] = [];
        try {
          subjects = typeof courseRow.subjects_json === 'string' ? JSON.parse(courseRow.subjects_json) : (courseRow.subjects_json || []);
        } catch (e) {
          subjects = [];
        }

        const lockedCourse = {
          _id: courseRow.id,
          id: courseRow.id,
          name: courseRow.name,
          description: courseRow.description,
          category: courseRow.category,
          board: courseRow.board,
          curriculum: courseRow.curriculum,
          subjects,
        };

        const d1Qs = await queryD1('SELECT * FROM questions WHERE course_id = ? AND is_active = 1', [courseRow.id]);
        const d1Attempts = await queryD1('SELECT * FROM attempts WHERE student_id = ? OR student_id = ?', [userId, String(auth.userId)]);
        const d1MockTests = await queryD1('SELECT * FROM mock_tests WHERE course_id = ? AND is_active = 1 LIMIT 2', [courseRow.id]);
        const d1Leaderboard = await queryD1("SELECT id, name, xp_total FROM users WHERE locked_course_id = ? AND status != 'Deleted' ORDER BY xp_total DESC", [courseRow.id]);

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
            type: mt.type,
            duration: mt.duration_minutes,
            cutoffMarks: mt.cutoff_marks,
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
      }
    } catch (d1Err) {
      console.warn('[api/dashboard] D1 fallback to mongo/memory:', d1Err);
    }

    // 2. Memory mode
    if (isMemoryMode) {
      const db = readSharedDb();
      const lockedCourse = (db.courses || []).find((c) => String(c._id) === courseId) || (typeof rawCourseId === 'object' ? rawCourseId : null);

      const attempts = (db.attempts || []).filter((a) => String(a.student_id) === String(user._id) && String(a.course_id) === courseId);
      const attemptedQIds = new Set<string>();
      attempts.forEach((a) => {
        (a.responses || []).forEach((r: any) => attemptedQIds.add(String(r.question_id)));
      });

      const courseQs = (db.questions || []).filter((q) => String(q.course_id) === courseId && q.is_active !== false);
      const topicSet = new Set<string>();
      courseQs.forEach((q) => {
        if (q.topic_tag) topicSet.add(q.topic_tag.trim());
      });

      const topicsList = Array.from(topicSet);
      let totalTopicCompletionSum = 0;

      topicsList.forEach((topicName) => {
        const topicQuestions = courseQs.filter(
          (q) =>
            (q.topic_tag || '').toLowerCase().includes(topicName.toLowerCase()) ||
            topicName.toLowerCase().includes((q.topic_tag || '').toLowerCase())
        );

        if (topicQuestions.length > 0) {
          let attemptedInTopic = 0;
          topicQuestions.forEach((q) => {
            if (attemptedQIds.has(String(q._id))) attemptedInTopic++;
          });
          totalTopicCompletionSum += Math.round((attemptedInTopic / topicQuestions.length) * 100);
        }
      });

      const progressPercent = topicsList.length > 0 ? Math.round(totalTopicCompletionSum / topicsList.length) : 0;

      const mockTests = (db.mockTests || [])
        .filter((mt) => String(mt.course_id) === courseId && mt.is_active !== false)
        .map((mt) => {
          const userAttempts = (db.attempts || []).filter(
            (a) => String(a.student_id) === String(user._id) && String(a.test_id) === String(mt._id)
          );
          const highestScore = userAttempts.reduce((max, a) => Math.max(max, a.score || 0), 0);
          return {
            id: mt._id,
            title: mt.title,
            type: mt.type,
            duration: mt.duration_minutes,
            cutoffMarks: mt.cutoff_marks,
            totalQuestions: mt.question_ids?.length || 0,
            attemptsCount: userAttempts.length,
            highestScore,
            isAttempted: userAttempts.length > 0,
          };
        });

      const incorrectLogMap = new Map<string, any>();
      attempts.forEach((a) => {
        (a.responses || []).forEach((r: any) => {
          const qId = String(r.question_id);
          const q = courseQs.find((item) => String(item._id) === qId);
          if (q) {
            const isIncorrect = r.is_correct === false || (r.selected_option !== undefined && r.selected_option !== null && r.selected_option !== q.correct_option);
            if (isIncorrect && !incorrectLogMap.has(qId)) {
              incorrectLogMap.set(qId, {
                questionId: q._id,
                topic: q.topic_tag || 'General',
                questionText: q.question_text,
                options: q.options || [],
                selectedOption: r.selected_option,
                correctOption: q.correct_option,
                explanation: q.explanation || q.detailed_explanation || '',
              });
            }
          }
        });
      });

      const incorrectLog = Array.from(incorrectLogMap.values());

      const leaderboardStudents = (db.users || [])
        .filter((u) => u.locked_course_id && String(u.locked_course_id) === courseId)
        .map((u) => ({
          id: u._id,
          name: u.name,
          xp: u.xp_total || 0,
          rank: 0,
        }))
        .sort((a, b) => b.xp - a.xp);

      leaderboardStudents.forEach((s, idx) => {
        s.rank = idx + 1;
      });

      const currentStudentRankObj = leaderboardStudents.find((s) => String(s.id) === String(user._id));
      const rank = currentStudentRankObj ? currentStudentRankObj.rank : 1;

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
    }

    // 3. Mongoose mode
    await dbConnect();
    let lockedCourse: any = null;
    if (typeof rawCourseId === 'object' && rawCourseId?.name) {
      lockedCourse = rawCourseId;
    } else {
      try {
        lockedCourse = await Course.findById(courseId);
      } catch (e) {
        lockedCourse = null;
      }
    }

    const courseQs = await Question.find({ course_id: courseId, is_active: true });
    const attempts = await Attempt.find({ student_id: user._id, course_id: courseId }).sort({ submitted_at: -1 });
    const attemptedQIds = new Set<string>();
    attempts.forEach((a) => {
      a.responses.forEach((r) => attemptedQIds.add(r.question_id.toString()));
    });

    const incorrectLogMap = new Map<string, any>();
    attempts.forEach((a) => {
      a.responses.forEach((r) => {
        const qId = r.question_id.toString();
        const q = courseQs.find((item) => item._id.toString() === qId);
        if (q) {
          const isIncorrect = r.is_correct === false || (r.selected_option !== undefined && r.selected_option !== null && r.selected_option !== q.correct_option);
          if (isIncorrect && !incorrectLogMap.has(qId)) {
            incorrectLogMap.set(qId, {
              _id: q._id.toString(),
              question_text: q.question_text,
              options: q.options || [],
              userSelectedOption: r.selected_option,
              correctOption: q.correct_option,
              explanation: q.explanation || '',
              detailed_explanation: q.detailed_explanation || '',
              topic_tag: q.topic_tag || a.topic_tag || 'General',
              attemptedAt: a.submitted_at || a.started_at || new Date().toISOString(),
              attemptType: a.type || 'practice',
            });
          }
        }
      });
    });
    const incorrectLog = Array.from(incorrectLogMap.values());

    const topicSet = new Set<string>();
    courseQs.forEach((q) => {
      if (q.topic_tag) topicSet.add(q.topic_tag.trim());
    });

    const topicsList = Array.from(topicSet);
    let totalTopicCompletionSum = 0;

    topicsList.forEach((topicName) => {
      const topicQuestions = courseQs.filter(
        (q) =>
          (q.topic_tag || '').toLowerCase().includes(topicName.toLowerCase()) ||
          topicName.toLowerCase().includes((q.topic_tag || '').toLowerCase())
      );

      if (topicQuestions.length > 0) {
        let attemptedInTopic = 0;
        topicQuestions.forEach((q) => {
          if (attemptedQIds.has(q._id.toString())) {
            attemptedInTopic++;
          }
        });
        totalTopicCompletionSum += Math.min(1, attemptedInTopic / topicQuestions.length);
      }
    });

    const progressPercent = topicsList.length > 0
      ? Math.min(100, Math.max(0, Math.round((totalTopicCompletionSum / topicsList.length) * 100)))
      : 0;

    const allCourses = await Course.find({});
    const validCourseIds = getEquivalentCourseIds(courseId, allCourses);
    const mockTests = await MockTest.find({ course_id: { $in: validCourseIds }, is_active: true }).limit(2);

    const leaderboardStudents = await User.find({
      locked_course_id: courseId,
      status: 'Active',
    })
      .sort({ xp_total: -1, created_at: 1 })
      .select('name xp_total');

    let rank = 1;
    for (let i = 0; i < leaderboardStudents.length; i++) {
      if (leaderboardStudents[i]._id.toString() === user._id.toString()) {
        rank = i + 1;
        break;
      }
    }

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        xp_total: user.xp_total,
        lockedCourse,
        progressPercent,
        rank: rank || 1,
      },
      mockTests,
      topLeaderboard: leaderboardStudents.slice(0, 3),
      incorrectLog,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
