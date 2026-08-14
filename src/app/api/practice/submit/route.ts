import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User, Question, Attempt, XPTransaction } from '@/lib/models';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1, executeD1 } from '@/lib/d1';

export async function POST(req: Request) {
  try {
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

    const { user, isMemoryMode, isD1 } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ error: 'No course locked' }, { status: 400 });
    }

    const rawCourseId = user.locked_course_id;
    const courseId = typeof rawCourseId === 'object' && rawCourseId?._id ? String(rawCourseId._id) : String(rawCourseId);
    const userId = String(user._id || user.id || auth.userId);

    // 1. Try D1 execution
    try {
      const qIds = (answers || []).map((a: any) => `'${a.questionId}'`).filter(Boolean);
      let d1Questions: any[] = [];
      if (qIds.length > 0) {
        d1Questions = await queryD1(`SELECT id, correct_option FROM questions WHERE id IN (${qIds.join(',')})`);
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
          `INSERT INTO attempts (id, student_id, course_id, type, topic_tag, responses_json, score, accuracy, time_spent_seconds, submission_type, started_at, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            attemptId,
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
              `+${xpEarned} XP for practice set (${correctCount} correct answers)`,
            ]
          );
        }

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

    // 2. Memory Mode Fallback
    if (isMemoryMode) {
      const db = readSharedDb();
      let correctCount = 0;
      let xpEarned = 0;
      const processedResponses: any[] = [];

      for (const ans of (answers || [])) {
        const q = (db.questions || []).find((item) => String(item._id) === String(ans.questionId));
        if (q) {
          const isCorrect = Number(ans.selectedOption) === Number(q.correct_option);
          if (isCorrect) {
            correctCount++;
            xpEarned += 27;
          }
          processedResponses.push({
            question_id: q._id,
            selected_option: ans.selectedOption,
            is_correct: isCorrect,
          });
        }
      }

      const totalQuestions = answers.length;
      const accuracyPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      const attempt = {
        _id: generateId(),
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

      if (xpEarned > 0) {
        user.xp_total = (user.xp_total || 0) + xpEarned;
        if (!db.xpTransactions) db.xpTransactions = [];
        db.xpTransactions.push({
          _id: generateId(),
          student_id: user._id || auth.userId,
          attempt_id: attempt._id,
          xp_amount: xpEarned,
          reason: `+${xpEarned} XP for practice set (${correctCount} correct answers)`,
          created_at: new Date().toISOString(),
        });
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
    }

    // 3. Mongoose Fallback
    await dbConnect();
    let correctCount = 0;
    let xpEarned = 0;
    const processedResponses: any[] = [];

    for (const ans of (answers || [])) {
      let q: any = null;
      try {
        q = await Question.findById(ans.questionId);
      } catch (e) {
        q = null;
      }
      if (q) {
        const isCorrect = Number(ans.selectedOption) === Number(q.correct_option);
        if (isCorrect) {
          correctCount++;
          xpEarned += 27;
        }
        processedResponses.push({
          question_id: q._id,
          selected_option: ans.selectedOption,
          is_correct: isCorrect,
        });
      }
    }

    const totalQuestions = answers.length;
    const accuracyPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const attempt = await Attempt.create({
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
      started_at: new Date(),
      submitted_at: new Date(),
    });

    if (xpEarned > 0) {
      user.xp_total = (user.xp_total || 0) + xpEarned;
      if (user.save) await user.save();
      await XPTransaction.create({
        student_id: user._id || auth.userId,
        attempt_id: attempt._id,
        xp_amount: xpEarned,
        reason: `+${xpEarned} XP for practice set (${correctCount} correct answers)`,
      });
    }

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
