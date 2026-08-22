import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1, executeD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userAnswers, submissionType, questionIds } = await req.json();

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ error: 'No course locked' }, { status: 400 });
    }

    const userId = String(user._id || user.id || auth.userId);
    const rawCourseId = user.locked_course_id;
    const courseId = typeof rawCourseId === 'object' && rawCourseId?._id ? String(rawCourseId._id) : String(rawCourseId);

    // 1. Primary: Cloudflare D1
    try {
      const d1Tests = await queryD1('SELECT * FROM mock_tests WHERE id = ? LIMIT 1', [params.id]);
      if (d1Tests && d1Tests.length > 0) {
        const test = d1Tests[0];
        const d1Courses = await queryD1('SELECT * FROM courses WHERE id = ? LIMIT 1', [courseId]);
        const course = d1Courses?.[0];

        const marksPerCorrect = Number(course?.marks_per_correct || 4);
        const penaltyPerIncorrect = Number(course?.penalty_per_incorrect || 1);

        // Resolve question IDs: from request body (exact questions student solved), or test JSON, or answer keys
        let qIds: string[] = [];
        if (Array.isArray(questionIds) && questionIds.length > 0) {
          qIds = questionIds.map((id: any) => String(id));
        } else {
          try {
            qIds = typeof test.question_ids_json === 'string' ? JSON.parse(test.question_ids_json) : (test.question_ids_json || []);
          } catch (e) {
            qIds = [];
          }
          if (qIds.length === 0 && userAnswers && typeof userAnswers === 'object') {
            qIds = Object.keys(userAnswers);
          }
        }

        let d1Questions: any[] = [];
        if (qIds.length > 0) {
          const quoted = qIds.map((id) => `'${id}'`).join(',');
          d1Questions = await queryD1(`SELECT id, correct_option, marks, topic_tag, subject FROM questions WHERE id IN (${quoted}) OR course_id = '${courseId}'`);
        } else {
          d1Questions = await queryD1(`SELECT id, correct_option, marks, topic_tag, subject FROM questions WHERE course_id = ?`, [courseId]);
          if (d1Questions.length > 0 && qIds.length === 0) {
            qIds = d1Questions.map((q) => String(q.id));
          }
        }

        let correctCount = 0;
        let incorrectCount = 0;
        let unattemptedCount = 0;
        let totalScore = 0;
        let xpEarned = 0;
        const processedResponses: any[] = [];

        for (const qId of qIds) {
          const q = (d1Questions || []).find((item: any) => String(item.id) === String(qId));
          const uAns = userAnswers
            ? (userAnswers[qId] || userAnswers[String(qId)] || (q ? userAnswers[q.id] || userAnswers[q._id] || userAnswers[String(q.id)] || userAnswers[String(q._id)] : null))
            : null;

          if (uAns && uAns.selectedOption !== null && uAns.selectedOption !== undefined && uAns.selectedOption >= 0) {
            const isCorrect = q ? Number(uAns.selectedOption) === Number(q.correct_option) : false;
            if (isCorrect) {
              correctCount++;
              totalScore += marksPerCorrect;
              xpEarned += 27;
            } else {
              incorrectCount++;
              totalScore -= penaltyPerIncorrect;
            }
            processedResponses.push({
              question_id: qId,
              selected_option: Number(uAns.selectedOption),
              is_correct: isCorrect,
            });
          } else {
            unattemptedCount++;
            processedResponses.push({
              question_id: qId,
              selected_option: null,
              is_correct: null,
            });
          }
        }

        const totalAttempted = correctCount + incorrectCount;
        const accuracyPercent = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

        let cutoffBonusAwarded = false;
        const cutoffMarks = Number(test.cutoff_marks || 0);
        if (cutoffMarks > 0 && totalScore >= cutoffMarks) {
          xpEarned += 100;
          cutoffBonusAwarded = true;
        }

        const attemptId = generateId();
        const finalScore = Math.max(0, totalScore);

        await executeD1(
          `INSERT INTO attempts (id, student_id, course_id, test_id, type, topic_tag, responses_json, score, accuracy, time_spent_seconds, submission_type, started_at, submitted_at)
           VALUES (?, ?, ?, ?, 'mock', ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            attemptId,
            userId,
            courseId,
            test.id,
            test.title || 'Mock Test',
            JSON.stringify(processedResponses),
            finalScore,
            accuracyPercent,
            submissionType || 'manual',
          ]
        );

        let newXpTotal = (user.xp_total || 0) + xpEarned;
        if (xpEarned > 0) {
          await executeD1('UPDATE users SET xp_total = COALESCE(xp_total, 0) + ? WHERE id = ? OR email = ?', [
            xpEarned,
            userId,
            String(user.email || '').toLowerCase(),
          ]);
          await executeD1(
            `INSERT INTO xp_transactions (id, student_id, attempt_id, xp_amount, reason, created_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              generateId(),
              userId,
              attemptId,
              xpEarned,
              cutoffBonusAwarded ? `+${xpEarned} XP (Cutoff Bonus)` : `+${xpEarned} XP for Mock Test`,
            ]
          );
        }

        return NextResponse.json({
          success: true,
          result: {
            score: finalScore,
            accuracyPercent,
            correctCount,
            incorrectCount,
            unattemptedCount,
            totalQuestions: qIds.length,
            xpEarned,
            cutoffBonusAwarded,
            newXpTotal,
          },
        });
      }
    } catch (d1Err) {
      console.warn('[api/mock-tests/submit] D1 submit fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const test = (db.mockTests || []).find((m) => m._id === params.id || m.id === params.id);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const course = (db.courses || []).find((c) => c._id === user.locked_course_id || c.id === user.locked_course_id);
    const marksPerCorrect = course?.marking_scheme?.marks_per_correct || 4;
    const penaltyPerIncorrect = course?.marking_scheme?.penalty_per_incorrect || 1;

    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let totalScore = 0;
    let xpEarned = 0;
    const processedResponses: any[] = [];

    let qList: any[] = [];
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      qList = questionIds.map((qId: string) => (db.questions || []).find((q) => String(q._id) === String(qId) || String(q.id) === String(qId))).filter(Boolean);
    } else if (Array.isArray(test.question_ids) && test.question_ids.length > 0) {
      qList = test.question_ids.map((qId: string) => (db.questions || []).find((q) => String(q._id) === String(qId) || String(q.id) === String(qId))).filter(Boolean);
    } else {
      qList = (db.questions || []).filter((q) => String(q.course_id) === String(courseId));
    }

    for (const q of qList) {
      const qId = String(q._id || q.id);
      const uAns = userAnswers
        ? (userAnswers[q._id] || userAnswers[q.id] || (q._id ? userAnswers[String(q._id)] : null) || (q.id ? userAnswers[String(q.id)] : null))
        : null;

      if (uAns && uAns.selectedOption !== null && uAns.selectedOption !== undefined && uAns.selectedOption >= 0) {
        const isCorrect = Number(uAns.selectedOption) === Number(q.correct_option);
        if (isCorrect) {
          correctCount++;
          totalScore += marksPerCorrect;
          xpEarned += 27;
        } else {
          incorrectCount++;
          totalScore -= penaltyPerIncorrect;
        }
        processedResponses.push({
          question_id: qId,
          selected_option: Number(uAns.selectedOption),
          is_correct: isCorrect,
        });
      } else {
        unattemptedCount++;
        processedResponses.push({
          question_id: qId,
          selected_option: null,
          is_correct: null,
        });
      }
    }

    const totalAttempted = correctCount + incorrectCount;
    const accuracyPercent = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

    let cutoffBonusAwarded = false;
    if (test.cutoff_marks && totalScore >= test.cutoff_marks) {
      xpEarned += 100;
      cutoffBonusAwarded = true;
    }

    const attempt = {
      _id: generateId(),
      student_id: user._id || auth.userId,
      course_id: user.locked_course_id,
      test_id: test._id || test.id,
      type: 'mock',
      topic_tag: test.title || 'Mock Test',
      responses: processedResponses,
      score: Math.max(0, totalScore),
      accuracy: accuracyPercent,
      submission_type: submissionType || 'manual',
      created_at: new Date().toISOString(),
    };

    if (!db.attempts) db.attempts = [];
    db.attempts.push(attempt);

    if (xpEarned > 0) {
      user.xp_total = (user.xp_total || 0) + xpEarned;
      if (!db.xpTransactions) db.xpTransactions = [];
      db.xpTransactions.push({
        _id: generateId(),
        student_id: user._id || auth.userId,
        attempt_id: attempt._id,
        xp_amount: xpEarned,
        reason: cutoffBonusAwarded ? `+${xpEarned} XP (Cutoff Bonus)` : `+${xpEarned} XP for Mock Test`,
        created_at: new Date().toISOString(),
      });
    }

    writeSharedDb(db);

    return NextResponse.json({
      success: true,
      result: {
        score: Math.max(0, totalScore),
        accuracyPercent,
        correctCount,
        incorrectCount,
        unattemptedCount,
        totalQuestions: qList.length,
        xpEarned,
        cutoffBonusAwarded,
        newXpTotal: user.xp_total || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
