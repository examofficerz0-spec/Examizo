import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User, Attempt, Course, MockTest, Question } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { queryD1 } from '@/lib/d1';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const studentId = params.id;
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    // 1. Try Cloudflare D1 first
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE id = ? LIMIT 1', [studentId]);
      if (d1Users && d1Users.length > 0) {
        const user = d1Users[0];
        const userCourseId = user.locked_course_id || null;
        let courseName = 'Unassigned';
        if (userCourseId) {
          const d1Courses = await queryD1('SELECT name FROM courses WHERE id = ? LIMIT 1', [userCourseId]);
          if (d1Courses && d1Courses.length > 0) courseName = d1Courses[0].name;
        }

        const courseStudents = await queryD1(
          "SELECT id, xp_total FROM users WHERE (locked_course_id = ? OR ? IS NULL) AND status != 'Deleted' ORDER BY xp_total DESC",
          [userCourseId, userCourseId]
        );

        const rankIndex = (courseStudents || []).findIndex((u: any) => String(u.id) === String(studentId));
        const rank = rankIndex !== -1 ? rankIndex + 1 : 1;

        const attempts = await queryD1(
          'SELECT * FROM attempts WHERE student_id = ? OR user_id = ? ORDER BY created_at DESC',
          [studentId, studentId]
        );

        const mockAttempts = (attempts || []).filter((a: any) => a.mock_test_id || a.test_type === 'mock_test');
        const practiceAttempts = (attempts || []).filter((a: any) => !a.mock_test_id || a.test_type === 'practice');

        const mockTestHistory = await Promise.all(
          mockAttempts.map(async (a: any) => {
            let title = a.test_title || 'Full Mock Examination';
            let totalMarks = a.total_marks || 300;

            if (a.mock_test_id) {
              const d1Tests = await queryD1('SELECT title, cutoff_marks, total_marks FROM mock_tests WHERE id = ? LIMIT 1', [a.mock_test_id]);
              if (d1Tests && d1Tests.length > 0) {
                title = d1Tests[0].title || title;
                totalMarks = d1Tests[0].cutoff_marks || d1Tests[0].total_marks || 300;
              }
            }

            return {
              id: a.id,
              title,
              score: a.score || 0,
              totalMarks,
              percentage: totalMarks > 0 ? Math.round(((a.score || 0) / totalMarks) * 100) : 0,
              timeSpentMinutes: Math.round((a.time_spent_seconds || 0) / 60),
              date: a.completed_at || a.created_at || new Date().toISOString(),
            };
          })
        );

        let totalModulesInCourse = 0;
        if (userCourseId) {
          const courseQuestions = await queryD1('SELECT topic_tag FROM questions WHERE course_id = ? AND is_active = 1', [userCourseId]);
          const uniqueTopics = new Set((courseQuestions || []).map((q: any) => q.topic_tag).filter(Boolean));
          totalModulesInCourse = uniqueTopics.size;
        }

        const modulesCompletedCount = practiceAttempts.filter((a: any) => {
          const pct = a.total_marks ? ((a.score || 0) / a.total_marks) * 100 : 0;
          return pct >= 50;
        }).length;

        const moduleCompletionPercentage = totalModulesInCourse > 0
          ? Math.min(100, Math.round((modulesCompletedCount / totalModulesInCourse) * 100))
          : 0;

        let totalQuestionsAttempted = 0;
        let totalTimeSpentSeconds = 0;
        let totalCorrectAnswers = 0;

        (attempts || []).forEach((a: any) => {
          let responses = [];
          try {
            responses = typeof a.responses_json === 'string' ? JSON.parse(a.responses_json) : (a.responses || []);
          } catch (_) {}

          const qCount = a.questions_count || responses.length;
          const timeSpent = a.time_spent_seconds || a.duration_seconds || 0;
          const correctCount = a.correct_answers_count || responses.filter((r: any) => r.is_correct).length;

          if (timeSpent > 0 && qCount > 0) {
            totalQuestionsAttempted += qCount;
            totalTimeSpentSeconds += timeSpent;
          }
          totalCorrectAnswers += correctCount;
        });

        const avgTimePerQuestionSeconds = totalQuestionsAttempted > 0
          ? Math.round(totalTimeSpentSeconds / totalQuestionsAttempted)
          : 0;

        const overallAccuracyPercentage = totalQuestionsAttempted > 0
          ? Math.round((totalCorrectAnswers / totalQuestionsAttempted) * 100)
          : 0;

        return NextResponse.json({
          student: {
            id: String(user.id),
            name: user.name,
            email: user.email,
            xpTotal: user.xp_total || 0,
            status: user.status || 'Active',
            lockedCourseName: courseName,
            rank,
            totalStudentsInBatch: (courseStudents || []).length,
          },
          stats: {
            mockTestsAttempted: mockAttempts.length,
            mockTestHistory,
            modulesCompletedCount,
            totalModulesInCourse,
            moduleCompletionPercentage,
            avgTimePerQuestionSeconds,
            totalAttempts: (attempts || []).length,
            overallAccuracyPercentage,
          },
        });
      }
    } catch (d1Err) {
      console.warn('[student-stats] D1 fallback:', d1Err);
    }

    // 2. Memory Mode Fallback
    const { isMemoryMode } = await dbConnect();

    if (isMemoryMode) {
      const db = readSharedDb();
      const user = (db.users || []).find((u) => String(u._id) === String(studentId) || String(u.id) === String(studentId));
      if (!user) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      const course = (db.courses || []).find((c) => String(c._id) === String(user.locked_course_id) || String(c.id) === String(user.locked_course_id));
      const userCourseId = user.locked_course_id ? String(user.locked_course_id) : null;

      const courseStudents = (db.users || [])
        .filter((u) => u.status !== 'Deleted' && (userCourseId ? String(u.locked_course_id) === userCourseId : true))
        .sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0));

      const rankIndex = courseStudents.findIndex((u) => String(u._id) === String(studentId) || String(u.id) === String(studentId));
      const rank = rankIndex !== -1 ? rankIndex + 1 : 1;

      const attempts = (db.attempts || []).filter((a) => String(a.user_id || a.student_id) === String(studentId));

      const mockAttempts = attempts.filter((a) => a.mock_test_id || a.test_type === 'mock_test');
      const practiceAttempts = attempts.filter((a) => !a.mock_test_id || a.test_type === 'practice');

      const mockTestHistory = mockAttempts.map((a) => {
        const test = (db.mockTests || []).find((m) => String(m._id) === String(a.mock_test_id) || String(m.id) === String(a.mock_test_id));
        const totalMarks = a.total_marks || test?.total_marks || 300;
        return {
          id: a._id || a.id,
          title: test?.title || a.test_title || 'Full Mock Examination',
          score: a.score || 0,
          totalMarks,
          percentage: totalMarks > 0 ? Math.round(((a.score || 0) / totalMarks) * 100) : 0,
          timeSpentMinutes: Math.round((a.time_spent_seconds || 0) / 60),
          date: a.completed_at || a.created_at || new Date().toISOString(),
        };
      });

      const modulesCompletedCount = practiceAttempts.filter((a) => {
        const pct = a.total_marks ? ((a.score || 0) / a.total_marks) * 100 : 0;
        return pct >= 50;
      }).length;

      const courseQuestions = (db.questions || []).filter((q) => !userCourseId || String(q.course_id) === userCourseId);
      const uniqueTopics = new Set(courseQuestions.map((q) => q.topic_tag).filter(Boolean));
      const totalModulesInCourse = uniqueTopics.size;

      const moduleCompletionPercentage = totalModulesInCourse > 0
        ? Math.min(100, Math.round((modulesCompletedCount / totalModulesInCourse) * 100))
        : 0;

      let totalQuestionsAttempted = 0;
      let totalTimeSpentSeconds = 0;
      let totalCorrectAnswers = 0;

      attempts.forEach((a) => {
        const qCount = a.questions_count || (Array.isArray(a.responses) ? a.responses.length : 0);
        const timeSpent = a.time_spent_seconds || a.duration_seconds || 0;
        const correctCount = a.correct_answers_count || (Array.isArray(a.responses) ? a.responses.filter((r: any) => r.is_correct).length : 0);

        if (timeSpent > 0 && qCount > 0) {
          totalQuestionsAttempted += qCount;
          totalTimeSpentSeconds += timeSpent;
        }
        totalCorrectAnswers += correctCount;
      });

      const avgTimePerQuestionSeconds = totalQuestionsAttempted > 0
        ? Math.round(totalTimeSpentSeconds / totalQuestionsAttempted)
        : 0;

      const overallAccuracyPercentage = totalQuestionsAttempted > 0
        ? Math.round((totalCorrectAnswers / totalQuestionsAttempted) * 100)
        : 0;

      return NextResponse.json({
        student: {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          xpTotal: user.xp_total || 0,
          status: user.status || 'Active',
          lockedCourseName: course?.name || 'Unassigned',
          rank,
          totalStudentsInBatch: courseStudents.length,
        },
        stats: {
          mockTestsAttempted: mockAttempts.length,
          mockTestHistory,
          modulesCompletedCount,
          totalModulesInCourse,
          moduleCompletionPercentage,
          avgTimePerQuestionSeconds,
          totalAttempts: attempts.length,
          overallAccuracyPercentage,
        },
      });
    }

    // 3. Mongoose Mode (only if Mongoose is connected)
    try {
      const user = await User.findById(studentId);
      if (!user) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      const userIdStr = user._id.toString();
      const userCourseId = user.locked_course_id ? user.locked_course_id.toString() : null;

      let courseName = 'Unassigned';
      if (user.locked_course_id) {
        const courseObj = await Course.findById(user.locked_course_id);
        if (courseObj) courseName = courseObj.name;
      }

      const batchQuery: any = { status: { $ne: 'Deleted' } };
      if (userCourseId) batchQuery.locked_course_id = userCourseId;

      const courseStudents = await User.find(batchQuery).sort({ xp_total: -1 }).select('_id xp_total');
      const rankIndex = courseStudents.findIndex((u) => u._id.toString() === userIdStr);
      const rank = rankIndex !== -1 ? rankIndex + 1 : 1;

      const attempts = await Attempt.find({
        $or: [{ user_id: userIdStr }, { student_id: userIdStr }],
      }).sort({ created_at: -1 });

      const mockAttempts = attempts.filter((a: any) => a.mock_test_id || a.test_type === 'mock_test');
      const practiceAttempts = attempts.filter((a: any) => !a.mock_test_id || a.test_type === 'practice');

      const mockTestHistory = await Promise.all(
        mockAttempts.map(async (a: any) => {
          let title = a.test_title || 'Full Mock Examination';
          let totalMarks = a.total_marks || 300;

          if (a.mock_test_id) {
            const test: any = await MockTest.findById(a.mock_test_id);
            if (test) {
              title = test.title;
              totalMarks = test.cutoff_marks || test.total_marks || 300;
            }
          }

          return {
            id: a._id.toString(),
            title,
            score: a.score || 0,
            totalMarks,
            percentage: totalMarks > 0 ? Math.round(((a.score || 0) / totalMarks) * 100) : 0,
            timeSpentMinutes: Math.round((a.time_spent_seconds || 0) / 60),
            date: a.completed_at || a.created_at || new Date().toISOString(),
          };
        })
      );

      let totalModulesInCourse = 0;
      if (userCourseId) {
        const courseQuestions = await Question.find({ course_id: userCourseId });
        const uniqueTopics = new Set(courseQuestions.map((q: any) => q.topic_tag).filter(Boolean));
        totalModulesInCourse = uniqueTopics.size;
      }

      const modulesCompletedCount = practiceAttempts.filter((a: any) => {
        const pct = a.total_marks ? ((a.score || 0) / a.total_marks) * 100 : 0;
        return pct >= 50;
      }).length;

      const moduleCompletionPercentage = totalModulesInCourse > 0
        ? Math.min(100, Math.round((modulesCompletedCount / totalModulesInCourse) * 100))
        : 0;

      let totalQuestionsAttempted = 0;
      let totalTimeSpentSeconds = 0;
      let totalCorrectAnswers = 0;

      attempts.forEach((a: any) => {
        const qCount = a.questions_count || (Array.isArray(a.responses) ? a.responses.length : 0);
        const timeSpent = a.time_spent_seconds || a.duration_seconds || 0;
        const correctCount = a.correct_answers_count || (Array.isArray(a.responses) ? a.responses.filter((r: any) => r.is_correct).length : 0);

        if (timeSpent > 0 && qCount > 0) {
          totalQuestionsAttempted += qCount;
          totalTimeSpentSeconds += timeSpent;
        }
        totalCorrectAnswers += correctCount;
      });

      const avgTimePerQuestionSeconds = totalQuestionsAttempted > 0
        ? Math.round(totalTimeSpentSeconds / totalQuestionsAttempted)
        : 0;

      const overallAccuracyPercentage = totalQuestionsAttempted > 0
        ? Math.round((totalCorrectAnswers / totalQuestionsAttempted) * 100)
        : 0;

      return NextResponse.json({
        student: {
          id: userIdStr,
          name: user.name,
          email: user.email,
          xpTotal: user.xp_total || 0,
          status: user.status || 'Active',
          lockedCourseName: courseName,
          rank,
          totalStudentsInBatch: courseStudents.length,
        },
        stats: {
          mockTestsAttempted: mockAttempts.length,
          mockTestHistory,
          modulesCompletedCount,
          totalModulesInCourse,
          moduleCompletionPercentage,
          avgTimePerQuestionSeconds,
          totalAttempts: attempts.length,
          overallAccuracyPercentage,
        },
      });
    } catch (_) {}

    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
