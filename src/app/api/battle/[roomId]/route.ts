import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { queryD1, executeD1, ensureD1Tables } from '@/lib/d1';
import { calculateBattleResults, getXpReward, BATTLE_CONFIG } from '@/lib/battleEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Get room state (polled by both players)
export async function GET(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureD1Tables();
    const roomId = params.roomId;

    const rooms = await queryD1(
      'SELECT * FROM battle_rooms WHERE id = ? LIMIT 1',
      [roomId]
    );

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ error: 'Battle room not found' }, { status: 404 });
    }

    const room = rooms[0] as any;

    // Only allow participants to view
    if (room.challenger_id !== auth.userId && room.opponent_id !== auth.userId) {
      return NextResponse.json({ error: 'Not a participant in this battle' }, { status: 403 });
    }

    const isChallenger = room.challenger_id === auth.userId;
    const questionsData = safeJsonParse(room.questions_data_json, []);
    const challengerAnswers = safeJsonParse(room.challenger_answers_json, {});
    const opponentAnswers = safeJsonParse(room.opponent_answers_json, {});

    // For in-progress games, hide opponent's answers for current question
    // but show for completed questions
    let safeOpponentAnswers: Record<string, any> = {};
    let safeChallengerAnswers: Record<string, any> = {};

    if (room.status === 'completed') {
      safeOpponentAnswers = opponentAnswers;
      safeChallengerAnswers = challengerAnswers;
    } else {
      // Only show answers for questions where BOTH have answered
      for (const key of Object.keys(challengerAnswers)) {
        if (opponentAnswers[key]) {
          safeChallengerAnswers[key] = challengerAnswers[key];
          safeOpponentAnswers[key] = opponentAnswers[key];
        } else if (isChallenger) {
          safeChallengerAnswers[key] = { ...challengerAnswers[key], pending: true };
        }
      }
      for (const key of Object.keys(opponentAnswers)) {
        if (challengerAnswers[key]) {
          // Already added above
        } else if (!isChallenger) {
          safeOpponentAnswers[key] = { ...opponentAnswers[key], pending: true };
        }
      }
    }

    // Strip correct_option from questions if game is in progress and question not yet answered by both
    const safeQuestions = questionsData.map((q: any, idx: number) => {
      const bothAnswered = challengerAnswers[String(idx)] && opponentAnswers[String(idx)];
      if (room.status === 'completed' || bothAnswered) {
        return q;
      }
      const { correct_option, ...safe } = q;
      return safe;
    });

    // Determine current active question (first unanswered by both)
    let currentQuestion = 0;
    for (let i = 0; i < questionsData.length; i++) {
      if (challengerAnswers[String(i)] && opponentAnswers[String(i)]) {
        currentQuestion = i + 1;
      } else {
        break;
      }
    }

    // Check if my answer is submitted for current question
    const myAnswers = isChallenger ? challengerAnswers : opponentAnswers;
    const theirAnswers = isChallenger ? opponentAnswers : challengerAnswers;
    const iAnsweredCurrent = !!myAnswers[String(currentQuestion)];
    const theyAnsweredCurrent = !!theirAnswers[String(currentQuestion)];
    const bothAnsweredCurrent = iAnsweredCurrent && theyAnsweredCurrent;

    return NextResponse.json({
      room: {
        id: room.id,
        challengerId: room.challenger_id,
        challengerName: room.challenger_name,
        opponentId: room.opponent_id,
        opponentName: room.opponent_name,
        status: room.status,
        courseId: room.course_id,
        currentQuestion,
        totalQuestions: questionsData.length,
        challengerReady: !!room.challenger_ready,
        opponentReady: !!room.opponent_ready,
        challengerScore: room.challenger_score || 0,
        opponentScore: room.opponent_score || 0,
        winnerId: room.winner_id,
        createdAt: room.created_at,
        completedAt: room.completed_at,
      },
      questions: safeQuestions,
      challengerAnswers: isChallenger ? challengerAnswers : safeChallengerAnswers,
      opponentAnswers: isChallenger ? safeOpponentAnswers : opponentAnswers,
      isChallenger,
      myRole: isChallenger ? 'challenger' : 'opponent',
      iAnsweredCurrent,
      theyAnsweredCurrent,
      bothAnsweredCurrent,
    });
  } catch (error: any) {
    console.error('[Battle Room GET Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Actions within the room (ready, answer, complete)
export async function POST(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureD1Tables();
    const roomId = params.roomId;
    const body = await request.json();
    const action = body.action;

    const rooms = await queryD1(
      'SELECT * FROM battle_rooms WHERE id = ? LIMIT 1',
      [roomId]
    );

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ error: 'Battle room not found' }, { status: 404 });
    }

    const room = rooms[0] as any;
    const isChallenger = room.challenger_id === auth.userId;
    const isOpponent = room.opponent_id === auth.userId;

    if (!isChallenger && !isOpponent) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // ── READY: Player marks themselves as ready in lobby ──
    if (action === 'ready') {
      if (isChallenger) {
        await executeD1(
          "UPDATE battle_rooms SET challenger_ready = 1 WHERE id = ?",
          [roomId]
        );
      } else {
        await executeD1(
          "UPDATE battle_rooms SET opponent_ready = 1 WHERE id = ?",
          [roomId]
        );
      }

      // Check if BOTH are now ready — transition to in_progress
      const updatedRooms = await queryD1(
        'SELECT challenger_ready, opponent_ready FROM battle_rooms WHERE id = ? LIMIT 1',
        [roomId]
      );
      const updated = updatedRooms?.[0] as any;

      if (updated?.challenger_ready && updated?.opponent_ready) {
        await executeD1(
          "UPDATE battle_rooms SET status = 'in_progress' WHERE id = ? AND status IN ('waiting', 'ready')",
          [roomId]
        );
      } else if (room.status === 'waiting') {
        await executeD1(
          "UPDATE battle_rooms SET status = 'ready' WHERE id = ? AND status = 'waiting'",
          [roomId]
        );
      }

      return NextResponse.json({ success: true, message: 'Marked ready' });
    }

    // ── ANSWER: Submit answer for current question ──
    if (action === 'answer') {
      const { questionIndex, answer, timeMs } = body;

      if (questionIndex === undefined || answer === undefined) {
        return NextResponse.json({ error: 'questionIndex and answer required' }, { status: 400 });
      }

      if (room.status !== 'in_progress') {
        return NextResponse.json({ error: 'Battle not in progress' }, { status: 400 });
      }

      const answersField = isChallenger ? 'challenger_answers_json' : 'opponent_answers_json';
      const currentAnswers = safeJsonParse(
        isChallenger ? room.challenger_answers_json : room.opponent_answers_json,
        {}
      );

      // Don't allow re-answering
      if (currentAnswers[String(questionIndex)]) {
        return NextResponse.json({ success: true, message: 'Already answered this question' });
      }

      currentAnswers[String(questionIndex)] = {
        answer: Number(answer),
        time_ms: timeMs || BATTLE_CONFIG.QUESTION_TIMEOUT_MS,
      };

      await executeD1(
        `UPDATE battle_rooms SET ${answersField} = ? WHERE id = ?`,
        [JSON.stringify(currentAnswers), roomId]
      );

      // Check if both players have now answered this question
      const otherAnswers = safeJsonParse(
        isChallenger ? room.opponent_answers_json : room.challenger_answers_json,
        {}
      );
      const bothAnswered = !!otherAnswers[String(questionIndex)];

      // Check if game is complete (both answered all questions)
      const questionsData = safeJsonParse(room.questions_data_json, []);
      const totalQ = questionsData.length;

      const allChallengerAnswers = isChallenger ? currentAnswers : safeJsonParse(room.challenger_answers_json, {});
      const allOpponentAnswers = isChallenger ? safeJsonParse(room.opponent_answers_json, {}) : currentAnswers;

      let allCompleted = true;
      for (let i = 0; i < totalQ; i++) {
        if (!allChallengerAnswers[String(i)] || !allOpponentAnswers[String(i)]) {
          allCompleted = false;
          break;
        }
      }

      if (allCompleted) {
        // Calculate final results
        const results = calculateBattleResults(
          allChallengerAnswers,
          allOpponentAnswers,
          questionsData.map((q: any) => ({ id: q.id, correct_option: q.correct_option }))
        );

        let winnerId: string | null = null;
        if (results.winnerId === 'challenger') winnerId = room.challenger_id;
        else if (results.winnerId === 'opponent') winnerId = room.opponent_id;

        await executeD1(
          `UPDATE battle_rooms SET 
            status = 'completed', 
            challenger_score = ?, 
            opponent_score = ?,
            winner_id = ?,
            completed_at = datetime('now'),
            current_question = ?
          WHERE id = ?`,
          [results.challengerScore, results.opponentScore, winnerId, totalQ, roomId]
        );

        // Award XP to both players
        const challengerOutcome = results.winnerId === 'challenger' ? 'win' : results.winnerId === 'draw' ? 'draw' : 'lose';
        const opponentOutcome = results.winnerId === 'opponent' ? 'win' : results.winnerId === 'draw' ? 'draw' : 'lose';

        const challengerXp = getXpReward(challengerOutcome);
        const opponentXp = getXpReward(opponentOutcome);

        // Add XP transactions
        const cXpId = `bxp_${roomId}_c_${Date.now()}`;
        const oXpId = `bxp_${roomId}_o_${Date.now()}`;

        await Promise.allSettled([
          executeD1(
            "INSERT INTO xp_transactions (id, student_id, attempt_id, xp_amount, reason) VALUES (?, ?, ?, ?, ?)",
            [cXpId, room.challenger_id, roomId, challengerXp, `Battle ${challengerOutcome} vs ${room.opponent_name}`]
          ),
          executeD1(
            "INSERT INTO xp_transactions (id, student_id, attempt_id, xp_amount, reason) VALUES (?, ?, ?, ?, ?)",
            [oXpId, room.opponent_id, roomId, opponentXp, `Battle ${opponentOutcome} vs ${room.challenger_name}`]
          ),
          executeD1(
            "UPDATE users SET xp_total = xp_total + ? WHERE id = ?",
            [challengerXp, room.challenger_id]
          ),
          executeD1(
            "UPDATE users SET xp_total = xp_total + ? WHERE id = ?",
            [opponentXp, room.opponent_id]
          ),
        ]);

        return NextResponse.json({
          success: true,
          completed: true,
          results: {
            ...results,
            challengerXp,
            opponentXp,
          },
        });
      }

      return NextResponse.json({
        success: true,
        bothAnswered,
        completed: false,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[Battle Room POST Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function safeJsonParse(str: any, fallback: any) {
  if (!str) return fallback;
  try {
    return typeof str === 'string' ? JSON.parse(str) : str;
  } catch {
    return fallback;
  }
}
