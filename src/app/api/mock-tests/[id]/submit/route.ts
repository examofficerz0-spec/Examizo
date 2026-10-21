import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1, executeD1, ensureD1Tables } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureD1Tables();
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userAnswers, submissionType, questionIds, timeSpentSeconds, isRetake } = await req.json();
    const actualTimeSpent = Math.max(0, Number(timeSpentSeconds || 0));

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

        // ─── Enforce strict 3 attempts limit (bypassed for Practice Retakes) ───
        const existingAtts = await queryD1(
          'SELECT count(*) as count FROM attempts WHERE (student_id = ? OR student_id = ? OR sub_profile_id = ? OR student_id = ? OR sub_profile_id = ?) AND (test_id = ? OR topic_tag = ?)',
          [userId, String(auth.email || ''), userId, String(user.account_email || ''), String(user.account_email || ''), test.id, test.title || '']
        );
        let totalExisting = Number(existingAtts?.[0]?.count || 0);
        try {
          const db = readSharedDb();
          const memCount = (db.attempts || []).filter(
            (a: any) =>
              (String(a.student_id) === userId || String(a.sub_profile_id) === userId || (user.email && String(a.student_id) === String(user.email))) &&
              (String(a.test_id) === test.id || a.topic_tag === test.title)
          ).length;
          totalExisting = Math.max(totalExisting, memCount);
        } catch (_) {}

        const isPracticeRetake = Boolean(isRetake || totalExisting > 0 || submissionType === 'practice_retake');

        if (!isPracticeRetake && totalExisting >= 3) {
          return NextResponse.json(
            { error: 'Maximum attempts limit reached (3 of 3 tries used). You cannot retake this examination further.' },
            { status: 403 }
          );
        }

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
          const placeholders = qIds.map(() => '?').join(',');
          d1Questions = await queryD1(
            `SELECT id, correct_option, marks, topic_tag, subject FROM questions WHERE id IN (${placeholders})`,
            qIds
          );
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
              if (!isPracticeRetake) {
                xpEarned += 27;
              }
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
        if (!isPracticeRetake && cutoffMarks > 0 && totalScore >= cutoffMarks) {
          xpEarned += 100;
          cutoffBonusAwarded = true;
        }

        if (isPracticeRetake) {
          xpEarned = 0;
          cutoffBonusAwarded = false;
        }

        const attemptId = generateId();
        const finalScore = totalScore;
        const finalSubmissionType = isPracticeRetake ? 'practice_retake' : (submissionType || 'manual');

        await executeD1(
          `INSERT INTO attempts (id, student_id, sub_profile_id, course_id, test_id, type, topic_tag, responses_json, score, accuracy, time_spent_seconds, submission_type, started_at, submitted_at)
           VALUES (?, ?, ?, ?, ?, 'mock', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            attemptId,
            userId,
            userId,
            courseId,
            test.id,
            test.title || 'Mock Test',
            JSON.stringify(processedResponses),
            finalScore,
            accuracyPercent,
            actualTimeSpent,
            finalSubmissionType,
          ]
        );

        // Mark any active mock_test_sessions as submitted
        await executeD1(
          `UPDATE mock_test_sessions 
           SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP 
           WHERE (student_id = ? OR student_id = ?) AND test_id = ? AND status = 'in_progress'`,
          [userId, String(auth.email || ''), test.id]
        ).catch(() => {});

        // Reliably persist incorrect answers into mistake_logs
        const mistakePromises: Promise<any>[] = [];
        for (const resp of processedResponses) {
          if (resp.is_correct === false) {
            const qMatch = (d1Questions || []).find((item: any) => String(item.id) === String(resp.question_id));
            mistakePromises.push(
              executeD1(
                `INSERT INTO mistake_logs (id, sub_profile_id, student_id, course_id, test_id, question_id, selected_option, correct_option, is_resolved, attempt_type, attempted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'mock', CURRENT_TIMESTAMP)`,
                [
                  generateId(),
                  userId,
                  userId,
                  courseId,
                  test.id,
                  resp.question_id,
                  resp.selected_option,
                  Number(qMatch?.correct_option || 0),
                ]
              ).catch((mErr) => console.warn('[api/mock-tests/submit] Mistake log insert error:', mErr))
            );
          }
        }
        if (mistakePromises.length > 0) {
          await Promise.all(mistakePromises);
        }

        let newXpTotal = (user.xp_total || 0) + (isPracticeRetake ? 0 : xpEarned);
        if (!isPracticeRetake && xpEarned > 0) {
          await executeD1('UPDATE users SET xp_total = COALESCE(xp_total, 0) + ? WHERE id = ? OR email = ?', [
            xpEarned,
            userId,
            String(user.email || '').toLowerCase(),
          ]);
          executeD1('UPDATE sub_profiles SET xp_total = COALESCE(xp_total, 0) + ? WHERE id = ?', [
            xpEarned,
            userId,
          ]).catch(() => {});
          await executeD1(
            `INSERT INTO xp_transactions (id, student_id, sub_profile_id, attempt_id, xp_amount, reason, created_at)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              generateId(),
              userId,
              userId,
              attemptId,
              xpEarned,
              cutoffBonusAwarded ? `+${xpEarned} XP (Cutoff Bonus)` : `+${xpEarned} XP for Mock Test`,
            ]
          );
        }

        // Dual-write to sharedDb for complete cross-tier persistence
        try {
          const db = readSharedDb();
          if (!db.attempts) db.attempts = [];
          db.attempts.push({
            _id: attemptId,
            id: attemptId,
            student_id: userId,
            sub_profile_id: userId,
            course_id: courseId,
            test_id: test.id,
            type: 'mock',
            topic_tag: test.title || 'Mock Test',
            responses: processedResponses,
            score: finalScore,
            accuracy: accuracyPercent,
            time_spent_seconds: actualTimeSpent,
            submission_type: finalSubmissionType,
            created_at: new Date().toISOString(),
          });

          if (!db.mistake_logs) db.mistake_logs = [];
          for (const resp of processedResponses) {
            if (resp.is_correct === false) {
              const qMatch = (d1Questions || []).find((item: any) => String(item.id) === String(resp.question_id));
              db.mistake_logs.push({
                _id: generateId(),
                id: generateId(),
                sub_profile_id: userId,
                student_id: userId,
                course_id: courseId,
                test_id: test.id,
                question_id: resp.question_id,
                selected_option: resp.selected_option,
                correct_option: Number(qMatch?.correct_option || 0),
                is_resolved: 0,
                attempt_type: 'mock',
                attempted_at: new Date().toISOString(),
              });
            }
          }

          const memUser = (db.users || []).find((u: any) => String(u._id) === userId || String(u.id) === userId || u.email === user.email);
          if (memUser && !isPracticeRetake && xpEarned > 0) {
            memUser.xp_total = (memUser.xp_total || 0) + xpEarned;
            if (!db.xpTransactions) db.xpTransactions = [];
            db.xpTransactions.push({
              _id: generateId(),
              student_id: userId,
              sub_profile_id: userId,
              attempt_id: attemptId,
              xp_amount: xpEarned,
              reason: cutoffBonusAwarded ? `+${xpEarned} XP (Cutoff Bonus)` : `+${xpEarned} XP for Mock Test`,
              created_at: new Date().toISOString(),
            });
          }

          if (db.mock_test_sessions) {
            db.mock_test_sessions.forEach((s: any) => {
              if (
                (String(s.student_id) === userId || String(s.student_id).toLowerCase() === String(auth.email || '').toLowerCase()) &&
                String(s.test_id) === String(test.id) &&
                s.status === 'in_progress'
              ) {
                s.status = 'submitted';
                s.submitted_at = new Date().toISOString();
              }
            });
          }
          writeSharedDb(db);
        } catch (_) {}

        return NextResponse.json({
          success: true,
          result: {
            score: finalScore,
            accuracyPercent,
            correctCount,
            incorrectCount,
            unattemptedCount,
            totalQuestions: qIds.length,
            timeSpentSeconds: actualTimeSpent,
            attemptsUsed: totalExisting + 1,
            maxAttempts: 3,
            xpEarned: isPracticeRetake ? 0 : xpEarned,
            isRetake: isPracticeRetake,
            submissionType: finalSubmissionType,
            cutoffBonusAwarded: isPracticeRetake ? false : cutoffBonusAwarded,
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

    // Check attempts limit in fallback
    const memUserAttempts = (db.attempts || []).filter(
      (a: any) =>
        (String(a.student_id) === userId || String(a.sub_profile_id) === userId || (user.email && String(a.student_id) === String(user.email))) &&
        (String(a.test_id) === String(test._id || test.id) || a.topic_tag === test.title)
    );

    const isPracticeRetake = Boolean(isRetake || memUserAttempts.length > 0 || submissionType === 'practice_retake');

    if (!isPracticeRetake && memUserAttempts.length >= 3) {
      return NextResponse.json(
        { error: 'Maximum attempts limit reached (3 of 3 tries used). You cannot retake this examination further.' },
        { status: 403 }
      );
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
          if (!isPracticeRetake) {
            xpEarned += 27;
          }
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
    if (!isPracticeRetake && test.cutoff_marks && totalScore >= test.cutoff_marks) {
      xpEarned += 100;
      cutoffBonusAwarded = true;
    }

    if (isPracticeRetake) {
      xpEarned = 0;
      cutoffBonusAwarded = false;
    }

    const finalSubmissionType = isPracticeRetake ? 'practice_retake' : (submissionType || 'manual');

    const attempt = {
      _id: generateId(),
      student_id: user._id || auth.userId,
      sub_profile_id: userId,
      course_id: user.locked_course_id,
      test_id: test._id || test.id,
      type: 'mock',
      topic_tag: test.title || 'Mock Test',
      responses: processedResponses,
      score: totalScore,
      accuracy: accuracyPercent,
      time_spent_seconds: actualTimeSpent,
      submission_type: finalSubmissionType,
      created_at: new Date().toISOString(),
    };

    if (!db.attempts) db.attempts = [];
    db.attempts.push(attempt);

    if (!db.mistake_logs) db.mistake_logs = [];
    for (const resp of processedResponses) {
      if (resp.is_correct === false) {
        const qMatch = (qList || []).find((item: any) => String(item._id || item.id) === String(resp.question_id));
        db.mistake_logs.push({
          _id: generateId(),
          id: generateId(),
          sub_profile_id: userId,
          student_id: userId,
          course_id: courseId,
          test_id: test._id || test.id,
          question_id: resp.question_id,
          selected_option: resp.selected_option,
          correct_option: Number(qMatch?.correct_option || 0),
          is_resolved: 0,
          attempt_type: 'mock',
          attempted_at: new Date().toISOString(),
        });
      }
    }

    // Also push attempt to D1 so Cloudflare D1 stays in sync even during fallback
    executeD1(
      `INSERT INTO attempts (id, student_id, sub_profile_id, course_id, test_id, type, topic_tag, responses_json, score, accuracy, time_spent_seconds, submission_type, started_at, submitted_at)
       VALUES (?, ?, ?, ?, ?, 'mock', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        attempt._id,
        userId,
        userId,
        courseId,
        test._id || test.id,
        test.title || 'Mock Test',
        JSON.stringify(processedResponses),
        attempt.score,
        accuracyPercent,
        actualTimeSpent,
        finalSubmissionType,
      ]
    ).catch(() => {});

    // Mark any active session as submitted in D1 fallback
    executeD1(
      `UPDATE mock_test_sessions 
       SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP 
       WHERE (student_id = ? OR student_id = ?) AND test_id = ? AND status = 'in_progress'`,
      [userId, String(auth.email || ''), String(test._id || test.id)]
    ).catch(() => {});

    if (db.mock_test_sessions) {
      db.mock_test_sessions.forEach((s: any) => {
        if (
          (String(s.student_id) === userId || String(s.student_id).toLowerCase() === String(auth.email || '').toLowerCase()) &&
          String(s.test_id) === String(test._id || test.id) &&
          s.status === 'in_progress'
        ) {
          s.status = 'submitted';
          s.submitted_at = new Date().toISOString();
        }
      });
    }

    if (!isPracticeRetake && xpEarned > 0) {
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

      executeD1('UPDATE users SET xp_total = COALESCE(xp_total, 0) + ? WHERE id = ? OR email = ?', [
        xpEarned,
        userId,
        String(user.email || '').toLowerCase(),
      ]).catch(() => {});
      executeD1('UPDATE sub_profiles SET xp_total = COALESCE(xp_total, 0) + ? WHERE id = ?', [
        xpEarned,
        userId,
      ]).catch(() => {});
      executeD1(
        `INSERT INTO xp_transactions (id, student_id, sub_profile_id, attempt_id, xp_amount, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          generateId(),
          userId,
          userId,
          attempt._id,
          xpEarned,
          cutoffBonusAwarded ? `+${xpEarned} XP (Cutoff Bonus)` : `+${xpEarned} XP for Mock Test`,
        ]
      ).catch(() => {});
    }

    writeSharedDb(db);

    return NextResponse.json({
      success: true,
      result: {
        score: totalScore,
        accuracyPercent,
        correctCount,
        incorrectCount,
        unattemptedCount,
        totalQuestions: qList.length,
        timeSpentSeconds: actualTimeSpent,
        attemptsUsed: memUserAttempts.length + 1,
        maxAttempts: 3,
        xpEarned: isPracticeRetake ? 0 : xpEarned,
        isRetake: isPracticeRetake,
        submissionType: finalSubmissionType,
        cutoffBonusAwarded: isPracticeRetake ? false : cutoffBonusAwarded,
        newXpTotal: user.xp_total || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
