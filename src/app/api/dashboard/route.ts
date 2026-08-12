import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User, Question, MockTest, Attempt, Course } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { getEquivalentCourseIds } from '@/lib/courseMatcher';

export async function GET() {
  try {
    await dbConnect();
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ needsCourseSelection: true }, { status: 200 });
    }

    const { user, isMemoryMode } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ needsCourseSelection: true }, { status: 200 });
    }

    if (isMemoryMode) {
      const db = readSharedDb();
      const rawCourseId = user.locked_course_id;
      const courseId = typeof rawCourseId === 'object' && rawCourseId?._id ? String(rawCourseId._id) : String(rawCourseId);
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

    // Mongoose mode
    const rawCourseId = user.locked_course_id;
    const courseId = typeof rawCourseId === 'object' && rawCourseId?._id 
      ? rawCourseId._id.toString() 
      : rawCourseId.toString();

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
