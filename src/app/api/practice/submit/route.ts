import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1, executeD1, ensureD1Tables } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    await ensureD1Tables();
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { answers, topicTag, type, timeSpentSeconds } = await req.json();
    const durationSeconds = Number(timeSpentSeconds || 0);

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ error: 'No course locked' }, { status: 400 });
    }

    const rawCourseId = user.locked_course_id;
    const courseId = typeof rawCourseId === 'object' && rawCourseId?._id ? String(rawCourseId._id) : String(rawCourseId);
    const userId = String(user._id || user.id || auth.userId);

    // 1. Primary: Cloudflare D1
    try {
      const rawQIds = (answers || []).map((a: any) => String(a.questionId || '').trim()).filter(Boolean);
      let d1Questions: any[] = [];
      if (rawQIds.length > 0) {
        const placeholders = rawQIds.map(() => '?').join(',');
        d1Questions = await queryD1(`SELECT id, correct_option FROM questions WHERE id IN (${placeholders})`, rawQIds);
      }

      if (d1Questions && d1Questions.length > 0) {
        let correctCount = 0;
        let xpEarned = 0;
        const processedResponses: any[] = [];

        for (const ans of (answers || [])) {
          const q = d1Questions.find((item: any) => String(item.id) === String(ans.questionId));
          if (q) {
            const isCorrect = Number(ans.selectedOption) === Number(q.correct_option);
            if (isCorrect) {
              correctCount++;
              xpEarned += 27;
            }
            processedResponses.push({
              question_id: q.id,
              selected_option: ans.selectedOption,
              is_correct: isCorrect,
            });
          }
        }

        const totalQuestions = answers.length;
        const accuracyPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        const attemptId = generateId();

        await executeD1(
          `INSERT INTO attempts (id, student_id, sub_profile_id, course_id, type, topic_tag, responses_json, score, accuracy, time_spent_seconds, submission_type, started_at, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            attemptId,
            userId,
            userId,
            courseId,
            type || 'practice',
            topicTag || 'General',
            JSON.stringify(processedResponses),
            correctCount,
            accuracyPercent,
            durationSeconds,
          ]
        );

        // Record any incorrect answers into mistake_logs table
        const mistakePromises: Promise<any>[] = [];
        const incorrectList: any[] = [];
        for (const resp of processedResponses) {
          if (resp.is_correct === false) {
            const qMatch = d1Questions.find((item: any) => String(item.id) === String(resp.question_id));
            const mistakeId = generateId();
            incorrectList.push({
              _id: mistakeId,
              id: mistakeId,
              sub_profile_id: userId,
              student_id: userId,
              course_id: courseId,
              test_id: null,
              question_id: resp.question_id,
              selected_option: resp.selected_option,
              correct_option: Number(qMatch?.correct_option || 0),
              is_resolved: 0,
              attempt_type: 'practice',
              attempted_at: new Date().toISOString(),
            });

            mistakePromises.push(
              executeD1(
                `INSERT INTO mistake_logs (id, sub_profile_id, student_id, course_id, test_id, question_id, selected_option, correct_option, is_resolved, attempt_type, attempted_at)
                 VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 0, 'practice', CURRENT_TIMESTAMP)`,
                [
                  mistakeId,
                  userId,
                  userId,
                  courseId,
                  resp.question_id,
                  resp.selected_option,
                  Number(qMatch?.correct_option || 0),
                ]
              ).catch((err) => {
                console.warn('[practice/submit] D1 mistake_logs insert error:', err);
              })
            );
          }
        }
        if (mistakePromises.length > 0) {
          await Promise.all(mistakePromises);
        }

        let newXpTotal = (user.xp_total || 0) + xpEarned;
        if (xpEarned > 0) {
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
              `+${xpEarned} XP for practice set (${correctCount} correct answers)`,
            ]
          );
        }

        // Dual-write to sharedDb for instant consistency
        try {
          const db = readSharedDb();
          if (!db.attempts) db.attempts = [];
          db.attempts.push({
            _id: attemptId,
            id: attemptId,
            student_id: userId,
            sub_profile_id: userId,
            course_id: courseId,
            type: type || 'practice',
            topic_tag: topicTag || 'General',
            responses: processedResponses,
            score: correctCount,
            accuracy: accuracyPercent,
            time_spent_seconds: durationSeconds,
            submission_type: 'manual',
            created_at: new Date().toISOString(),
          });

          if (incorrectList.length > 0) {
            if (!(db as any).mistake_logs) (db as any).mistake_logs = [];
            (db as any).mistake_logs.push(...incorrectList);
          }

          const memUser = (db.users || []).find((u: any) => String(u._id) === userId || String(u.id) === userId || u.email === user.email);
          if (memUser && xpEarned > 0) {
            memUser.xp_total = (memUser.xp_total || 0) + xpEarned;
            if (!db.xpTransactions) db.xpTransactions = [];
            db.xpTransactions.push({
              _id: generateId(),
              student_id: userId,
              sub_profile_id: userId,
              attempt_id: attemptId,
              xp_amount: xpEarned,
              reason: `+${xpEarned} XP for practice set (${correctCount} correct answers)`,
              created_at: new Date().toISOString(),
            });
          }
          writeSharedDb(db);
        } catch (_) {}

        return NextResponse.json({
          success: true,
          attempt: {
            _id: attemptId,
            id: attemptId,
            student_id: userId,
            course_id: courseId,
            type: type || 'practice',
            topic_tag: topicTag || 'General',
            responses: processedResponses,
            score: correctCount,
            accuracy: accuracyPercent,
            time_spent_seconds: durationSeconds,
          },
          correctCount,
          totalQuestions,
          accuracyPercent,
          xpEarned,
          newXpTotal,
        });
      }
    } catch (d1Err) {
      console.warn('[api/practice/submit] D1 submit fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    let correctCount = 0;
    let xpEarned = 0;
    const processedResponses: any[] = [];

    for (const ans of (answers || [])) {
      const q = (db.questions || []).find((item) => String(item._id) === String(ans.questionId) || String(item.id) === String(ans.questionId));
      if (q) {
        const isCorrect = Number(ans.selectedOption) === Number(q.correct_option);
        if (isCorrect) {
          correctCount++;
          xpEarned += 27;
        }
        processedResponses.push({
          question_id: q._id || q.id,
          selected_option: ans.selectedOption,
          is_correct: isCorrect,
        });
      }
    }

    const totalQuestions = (answers || []).length;
    const accuracyPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const attempt = {
      _id: generateId(),
      id: generateId(),
      student_id: user._id || auth.userId,
      course_id: user.locked_course_id,
      type: type || 'practice',
      topic_tag: topicTag || 'General',
      responses: processedResponses,
      score: correctCount,
      accuracy: accuracyPercent,
      questions_count: totalQuestions,
      time_spent_seconds: durationSeconds,
      submission_type: 'manual',
      created_at: new Date().toISOString(),
    };

    if (!db.attempts) db.attempts = [];
    db.attempts.push(attempt);

    // Also push to D1 for continuous synchronization
    executeD1(
      `INSERT INTO attempts (id, student_id, sub_profile_id, course_id, type, topic_tag, responses_json, score, accuracy, time_spent_seconds, submission_type, started_at, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        attempt._id,
        userId,
        userId,
        courseId,
        type || 'practice',
        topicTag || 'General',
        JSON.stringify(processedResponses),
        correctCount,
        accuracyPercent,
        durationSeconds,
      ]
    ).catch(() => {});

    if (xpEarned > 0) {
      user.xp_total = (user.xp_total || 0) + xpEarned;
      if (!db.xpTransactions) db.xpTransactions = [];
      db.xpTransactions.push({
        _id: generateId(),
        id: generateId(),
        student_id: user._id || auth.userId,
        sub_profile_id: userId,
        attempt_id: attempt._id,
        xp_amount: xpEarned,
        reason: `+${xpEarned} XP for practice set (${correctCount} correct answers)`,
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
          `+${xpEarned} XP for practice set (${correctCount} correct answers)`,
        ]
      ).catch(() => {});
    }

    writeSharedDb(db);

    return NextResponse.json({
      success: true,
      attempt,
      correctCount,
      totalQuestions,
      accuracyPercent,
      xpEarned,
      newXpTotal: user.xp_total || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
