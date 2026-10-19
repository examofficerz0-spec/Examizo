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
      const res = NextResponse.json({ error: 'User deleted or not found', deleted: true }, { status: 401 });
      res.cookies.set('student_token', '', { maxAge: 0, path: '/', expires: new Date(0) });
      res.cookies.delete('student_token');
      return res;
    }

    const { user } = authResult;
    let rawCourseId = user.locked_course_id || auth.lockedCourseId;

    if (!rawCourseId || !String(rawCourseId).trim()) {
      try {
        const memDb = readSharedDb();
        const emailLower = (auth.email || '').toLowerCase().trim();
        const uId = String(auth.userId || user._id || user.id);
        let memMatch = (memDb.users || []).find(
          (u: any) => uId && (String(u._id) === uId || String(u.id) === uId)
        );
        if (!memMatch && emailLower) {
          memMatch = (memDb.users || []).find(
            (u: any) => (u.email || '').toLowerCase().trim() === emailLower
          );
        }
        if (!memMatch && emailLower) {
          memMatch = (memDb.users || []).find(
            (u: any) => (u.account_email || '').toLowerCase().trim() === emailLower
          );
        }
        if (memMatch?.locked_course_id) {
          rawCourseId = memMatch.locked_course_id;
        }
      } catch (_) {}
    }

    if (!rawCourseId || !String(rawCourseId).trim()) {
      return NextResponse.json({ needsCourseSelection: true }, { status: 200 });
    }

    const courseId = typeof rawCourseId === 'object' && rawCourseId?._id 
      ? String(rawCourseId._id) 
      : String(rawCourseId).trim();

    user.locked_course_id = courseId;
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
      const [d1Qs, rawAttempts, rawMockTests, d1Leaderboard] = await Promise.all([
        queryD1('SELECT * FROM questions WHERE course_id = ? AND (is_active IS NULL OR is_active != 0)', [courseDbId]),
        queryD1(
          'SELECT * FROM attempts WHERE student_id = ? OR sub_profile_id = ? OR student_id = ? OR student_id = ? OR sub_profile_id = ? ORDER BY submitted_at DESC, started_at DESC',
          [userId, userId, String(auth.email || ''), String(user.email || ''), String(user.account_email || '')]
        ),
        queryD1('SELECT * FROM mock_tests WHERE course_id = ? AND (is_active IS NULL OR is_active != 0)', [courseDbId]),
        queryD1(
          "SELECT id, name, nickname, full_name, xp_total FROM users WHERE locked_course_id = ? AND status != 'Deleted' ORDER BY xp_total DESC LIMIT 10",
          [courseDbId]
        ),
      ]);

      let d1Attempts = rawAttempts || [];

      try {
        const db = readSharedDb();
        const memAtts = (db.attempts || []).filter(
          (a: any) =>
            String(a.student_id) === userId ||
            String(a.sub_profile_id) === userId ||
            (user.email && (String(a.student_id) === String(user.email) || String(a.student_id) === String(auth.email))) ||
            (user.account_email && String(a.student_id) === String(user.account_email))
        );
        const existingIds = new Set((d1Attempts || []).map((x: any) => String(x.id || x._id)));
        memAtts.forEach((a: any) => {
          const aId = String(a.id || a._id);
          if (!existingIds.has(aId)) {
            d1Attempts.push({
              id: aId,
              student_id: a.student_id,
              sub_profile_id: a.sub_profile_id,
              course_id: a.course_id,
              test_id: a.test_id,
              type: a.type,
              topic_tag: a.topic_tag,
              responses_json: typeof a.responses === 'string' ? a.responses : JSON.stringify(a.responses || a.responses_json || []),
              score: a.score,
              accuracy: a.accuracy,
              time_spent_seconds: a.time_spent_seconds,
              submitted_at: a.submitted_at || a.created_at,
              started_at: a.started_at || a.created_at,
            });
            existingIds.add(aId);
          }
        });
      } catch (_) {}

      let d1MockTests = rawMockTests;
      if (!d1MockTests || d1MockTests.length === 0) {
        try {
          const db = readSharedDb();
          const memTests = (db.mockTests || []).filter((m: any) => String(m.course_id) === courseDbId && m.is_active !== false);
          if (memTests.length > 0) {
            d1MockTests = memTests.map((m: any) => ({
              id: m._id || m.id,
              title: m.title,
              type: m.type || 'full',
              duration_minutes: m.duration_minutes || 60,
              cutoff_marks: m.cutoff_marks || 120,
              question_ids_json: JSON.stringify(m.question_ids || []),
            }));
          }
        } catch (_) {}
      }

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
          image_url: q.image_url || '',
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
          responses = typeof a.responses_json === 'string' ? JSON.parse(a.responses_json) : (a.responses_json || a.responses || []);
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
          started_at: a.started_at || a.submitted_at,
        };
      });

      const attemptedQIds = new Set<string>();
      formattedAttempts.forEach((a) => {
        (a.responses || []).forEach((r: any) => {
          if (r.question_id) attemptedQIds.add(String(r.question_id));
        });
      });

      // Fetch any missing questions that were attempted but not under current course_id
      const knownQMap = new Map<string, any>(formattedQs.map((q: any) => [String(q.id || q._id), q]));
      const missingQIds = Array.from(attemptedQIds).filter((id) => !knownQMap.has(id));
      if (missingQIds.length > 0) {
        try {
          const placeholders = missingQIds.map(() => '?').join(',');
          const extraD1Qs = await queryD1(`SELECT * FROM questions WHERE id IN (${placeholders})`, missingQIds);
          (extraD1Qs || []).forEach((q: any) => {
            let opts: string[] = [];
            try {
              opts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []);
            } catch (_) {}
            const fQ = {
              _id: q.id,
              id: q.id,
              question_text: q.question_text,
              image_url: q.image_url || '',
              options: opts,
              correct_option: Number(q.correct_option || 0),
              explanation: q.explanation || '',
              detailed_explanation: q.detailed_explanation || '',
              topic_tag: q.topic_tag || 'General',
            };
            formattedQs.push(fQ);
            knownQMap.set(String(q.id), fQ);
          });
        } catch (_) {}

        try {
          const db = readSharedDb();
          (db.questions || []).forEach((q: any) => {
            const qIdStr = String(q._id || q.id);
            if (!knownQMap.has(qIdStr) && attemptedQIds.has(qIdStr)) {
              const fQ = {
                _id: qIdStr,
                id: qIdStr,
                question_text: q.question_text,
                image_url: q.image_url || '',
                options: q.options || [],
                correct_option: Number(q.correct_option || 0),
                explanation: q.explanation || '',
                detailed_explanation: q.detailed_explanation || '',
                topic_tag: q.topic_tag || 'General',
              };
              formattedQs.push(fQ);
              knownQMap.set(qIdStr, fQ);
            }
          });
        } catch (_) {}
      }

      const mockTestMap = new Map<string, any>();
      (d1MockTests || []).forEach((mt: any) => {
        mockTestMap.set(String(mt.id), mt);
        if (mt._id) mockTestMap.set(String(mt._id), mt);
      });

      // ─── Query mistake_logs table directly ───
      let directMistakeLogs: any[] = [];
      try {
        directMistakeLogs = (await queryD1(
          'SELECT * FROM mistake_logs WHERE student_id = ? OR sub_profile_id = ? OR student_id = ? OR student_id = ? ORDER BY attempted_at DESC',
          [userId, userId, String(auth.email || ''), String(user.email || '')]
        )) || [];
      } catch (_) {}

      try {
        const db = readSharedDb();
        const memMistakes = (db.mistake_logs || []).filter(
          (m: any) =>
            String(m.student_id) === userId ||
            String(m.sub_profile_id) === userId ||
            (user.email && String(m.student_id) === String(user.email))
        );
        const existingMLIds = new Set((directMistakeLogs || []).map((m: any) => String(m.id || m._id)));
        memMistakes.forEach((m: any) => {
          const mId = String(m.id || m._id);
          if (!existingMLIds.has(mId)) {
            directMistakeLogs.push(m);
            existingMLIds.add(mId);
          }
        });
      } catch (_) {}

      const incorrectLogMap = new Map<string, any>();

      // Merge direct mistake_logs entries
      (directMistakeLogs || []).forEach((ml: any) => {
        const qId = String(ml.question_id);
        const q = knownQMap.get(qId);
        const testId = ml.test_id ? String(ml.test_id) : 'practice';
        const uniqueKey = `${testId}_${qId}`;
        const matchedTest = ml.test_id ? mockTestMap.get(String(ml.test_id)) : null;
        const testTitle = matchedTest?.title || (ml.attempt_type === 'mock' ? 'Mock Examination' : 'Practice Session');

        if (!incorrectLogMap.has(uniqueKey)) {
          incorrectLogMap.set(uniqueKey, {
            _id: `${testId}_${qId}`,
            question_id: qId,
            test_id: testId,
            test_title: testTitle,
            test_type: ml.attempt_type || (ml.test_id ? 'mock' : 'practice'),
            question_text: q?.question_text || `Question #${qId}`,
            image_url: q?.image_url || '',
            options: q?.options || ['Option A', 'Option B', 'Option C', 'Option D'],
            userSelectedOption: ml.selected_option,
            correctOption: ml.correct_option !== undefined ? ml.correct_option : q?.correct_option,
            explanation: q?.explanation || '',
            detailed_explanation: q?.detailed_explanation || '',
            topic_tag: q?.topic_tag || 'General',
            attemptedAt: ml.attempted_at || new Date().toISOString(),
            attemptType: ml.attempt_type || (ml.test_id ? 'mock' : 'practice'),
          });
        }
      });

      // Merge attempt responses
      formattedAttempts.forEach((a) => {
        const isMock = a.type === 'mock' || Boolean(a.test_id);
        let testTitle = 'General Practice';
        if (isMock) {
          const matchedTest = a.test_id ? mockTestMap.get(String(a.test_id)) : null;
          testTitle = matchedTest?.title || a.topic_tag || 'Mock Examination';
        } else if (a.topic_tag) {
          testTitle = `Practice - ${a.topic_tag}`;
        } else {
          testTitle = 'Practice Session';
        }

        const testId = a.test_id ? String(a.test_id) : (a.id ? `attempt-${a.id}` : `practice-${a.topic_tag || 'general'}`);

        (a.responses || []).forEach((r: any) => {
          const qId = String(r.question_id);
          const q = knownQMap.get(qId);
          const isIncorrect = r.is_correct === false || (r.selected_option !== undefined && r.selected_option !== null && r.selected_option >= 0 && q && Number(r.selected_option) !== Number(q.correct_option));
          if (isIncorrect) {
            const uniqueKey = `${testId}_${qId}`;
            if (!incorrectLogMap.has(uniqueKey)) {
              incorrectLogMap.set(uniqueKey, {
                _id: `${testId}_${qId}`,
                question_id: qId,
                test_id: testId,
                test_title: testTitle,
                test_type: isMock ? 'mock' : 'practice',
                question_text: q?.question_text || `Question #${qId}`,
                image_url: q?.image_url || '',
                options: q?.options || ['Option A', 'Option B', 'Option C', 'Option D'],
                userSelectedOption: r.selected_option,
                correctOption: q?.correct_option ?? 0,
                explanation: q?.explanation || '',
                detailed_explanation: q?.detailed_explanation || '',
                topic_tag: q?.topic_tag || a.topic_tag || 'General',
                attemptedAt: a.submitted_at || new Date().toISOString(),
                attemptType: a.type || (isMock ? 'mock' : 'practice'),
              });
            }
          }
        });
      });
      const incorrectLog = Array.from(incorrectLogMap.values());

      // ─── Compute Mock Test Attempt History ───
      const mockAttempts = formattedAttempts.filter((a) => a.type === 'mock' || Boolean(a.test_id));
      const mockTestHistory = mockAttempts.map((a, _idx, arr) => {
        const matchedTest = a.test_id ? mockTestMap.get(String(a.test_id)) : null;
        let totalQuestions = (a.responses || []).length;
        let totalMarks = totalQuestions * 4 || 100;
        if (matchedTest) {
          let qIds = [];
          try {
            qIds = typeof matchedTest.question_ids_json === 'string' ? JSON.parse(matchedTest.question_ids_json) : (matchedTest.question_ids || []);
          } catch (_) {}
          if (qIds.length > 0) {
            totalQuestions = qIds.length;
            totalMarks = totalQuestions * 4;
          }
        }

        const sameTestAttempts = arr
          .filter((item) => String(item.test_id || item.topic_tag) === String(a.test_id || a.topic_tag))
          .sort((x, y) => new Date(x.submitted_at || 0).getTime() - new Date(y.submitted_at || 0).getTime());
        const tryIndex = sameTestAttempts.findIndex((item) => item.id === a.id);
        const tryNumber = tryIndex !== -1 ? tryIndex + 1 : 1;

        const score = Number(a.score || 0);
        const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : Number(a.accuracy || 0);
        const timeSpentMinutes = Math.max(1, Math.round(Number(a.time_spent_seconds || 0) / 60));

        return {
          id: a.id || a._id,
          test_id: a.test_id,
          title: matchedTest?.title || a.topic_tag || 'Mock Examination',
          score,
          totalMarks,
          percentage,
          accuracy: Number(a.accuracy || 0),
          totalQuestions,
          timeSpentMinutes,
          timeSpentSeconds: Number(a.time_spent_seconds || 0),
          tryNumber,
          date: a.submitted_at || a.started_at || new Date().toISOString(),
          submittedAt: a.submitted_at || a.started_at,
        };
      }).sort((x, y) => new Date(y.date || 0).getTime() - new Date(x.date || 0).getTime());

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
        name: u.nickname && String(u.nickname).trim() ? String(u.nickname).trim() : (u.full_name || u.name),
        xp: u.xp_total || 0,
      }));

      let rank = 1;
      for (let i = 0; i < leaderboardStudents.length; i++) {
        if (String(leaderboardStudents[i].id) === userId) {
          rank = i + 1;
          break;
        }
      }

      const activeDisplayName = user.nickname && String(user.nickname).trim() ? String(user.nickname).trim() : (user.full_name || user.name);

      return NextResponse.json({
        user: {
          name: activeDisplayName,
          email: user.email,
          xp_total: user.xp_total || 0,
          lockedCourse,
          progressPercent,
          rank: rank || 1,
        },
        mockTests,
        mockTestHistory,
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

    const courseMockTests = (db.mockTests || (db as any).mock_tests || []).filter((mt: any) => String(mt.course_id) === courseId && mt.is_active !== false);
    const mockTestMap = new Map<string, any>();
    courseMockTests.forEach((mt: any) => {
      mockTestMap.set(String(mt._id || mt.id), mt);
    });

    const attempts = (db.attempts || []).filter((a) => (String(a.student_id) === userId || String(a.sub_profile_id) === userId) && String(a.course_id) === courseId);
    const courseQs = (db.questions || []).filter((q) => String(q.course_id) === courseId && q.is_active !== false);

    const incorrectLogMap = new Map<string, any>();
    (attempts || []).forEach((a) => {
      const isMock = a.type === 'mock' || Boolean(a.test_id || a.mock_test_id);
      const testRefId = a.test_id || a.mock_test_id;
      let testTitle = 'General Practice';
      if (isMock) {
        const matchedTest = testRefId ? mockTestMap.get(String(testRefId)) : null;
        testTitle = matchedTest?.title || a.topic_tag || 'Mock Examination';
      } else if (a.topic_tag) {
        testTitle = `Practice - ${a.topic_tag}`;
      } else {
        testTitle = 'Practice Session';
      }

      const testId = testRefId ? String(testRefId) : (a._id || a.id ? `attempt-${a._id || a.id}` : `practice-${a.topic_tag || 'general'}`);

      (a.responses || []).forEach((r: any) => {
        const qId = String(r.question_id);
        const q = (courseQs || []).find((item: any) => String(item._id || item.id) === qId);
        if (q) {
          const isIncorrect = r.is_correct === false || (r.selected_option !== undefined && r.selected_option !== null && r.selected_option >= 0 && Number(r.selected_option) !== Number(q.correct_option));
          if (isIncorrect) {
            const uniqueKey = `${testId}_${qId}`;
            if (!incorrectLogMap.has(uniqueKey)) {
              incorrectLogMap.set(uniqueKey, {
                _id: `${testId}_${q._id || q.id}`,
                id: `${testId}_${q._id || q.id}`,
                question_id: q._id || q.id,
                test_id: testId,
                test_title: testTitle,
                test_type: isMock ? 'mock' : 'practice',
                question_text: q.question_text,
                image_url: q.image_url || '',
                options: q.options || [],
                userSelectedOption: r.selected_option,
                correctOption: q.correct_option,
                explanation: q.explanation || '',
                detailed_explanation: q.detailed_explanation || '',
                topic_tag: q.topic_tag || a.topic_tag || 'General',
                attemptedAt: a.created_at || a.submitted_at || new Date().toISOString(),
                attemptType: a.type || (isMock ? 'mock' : 'practice'),
              });
            }
          }
        }
      });
    });
    const fallbackIncorrectLog = Array.from(incorrectLogMap.values());

    // Fallback Mock Test Attempt History
    const fallbackMockAttempts = (attempts || []).filter((a: any) => a.type === 'mock' || Boolean(a.test_id || a.mock_test_id));
    const fallbackMockTestHistory = fallbackMockAttempts.map((a: any, _idx: number, arr: any[]) => {
      const testRefId = a.test_id || a.mock_test_id;
      const matchedTest = testRefId ? mockTestMap.get(String(testRefId)) : null;
      let totalQuestions = (a.responses || []).length;
      let totalMarks = totalQuestions * 4 || 100;
      if (matchedTest && Array.isArray(matchedTest.question_ids) && matchedTest.question_ids.length > 0) {
        totalQuestions = matchedTest.question_ids.length;
        totalMarks = totalQuestions * 4;
      }
      const sameTestAttempts = arr
        .filter((item) => String(item.test_id || item.mock_test_id || item.topic_tag) === String(testRefId || a.topic_tag))
        .sort((x, y) => new Date(x.submitted_at || x.created_at || 0).getTime() - new Date(y.submitted_at || y.created_at || 0).getTime());
      const tryIndex = sameTestAttempts.findIndex((item) => (item.id || item._id) === (a.id || a._id));
      const tryNumber = tryIndex !== -1 ? tryIndex + 1 : 1;
      const score = Number(a.score || 0);
      const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : Number(a.accuracy || 0);
      const timeSpentMinutes = Math.max(1, Math.round(Number(a.time_spent_seconds || 0) / 60));
      return {
        id: a.id || a._id,
        test_id: testRefId,
        title: matchedTest?.title || a.topic_tag || 'Mock Examination',
        score,
        totalMarks,
        percentage,
        accuracy: Number(a.accuracy || 0),
        totalQuestions,
        timeSpentMinutes,
        timeSpentSeconds: Number(a.time_spent_seconds || 0),
        tryNumber,
        date: a.submitted_at || a.created_at || new Date().toISOString(),
        submittedAt: a.submitted_at || a.created_at,
      };
    }).sort((x, y) => new Date(y.date || 0).getTime() - new Date(x.date || 0).getTime());

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        xp_total: user.xp_total || 0,
        lockedCourse,
        progressPercent: 0,
        rank: 1,
      },
      mockTests: courseMockTests.slice(0, 2).map((mt: any) => ({
        id: mt._id || mt.id,
        _id: mt._id || mt.id,
        title: mt.title,
        type: mt.type || 'full',
        duration: mt.duration_minutes || 180,
        cutoffMarks: mt.cutoff_marks || 120,
        totalQuestions: Array.isArray(mt.question_ids) ? mt.question_ids.length : 0,
        attemptsCount: 0,
        highestScore: 0,
        isAttempted: false,
      })),
      mockTestHistory: fallbackMockTestHistory,
      topLeaderboard: [],
      incorrectLog: fallbackIncorrectLog,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal dashboard error' }, { status: 500 });
  }
}
