import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { queryD1, executeD1, ensureD1Tables } from '@/lib/d1';
import { generateRoomId, shuffleArray, BATTLE_CONFIG } from '@/lib/battleEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST: Create a battle room, send heartbeat, or check pending challenges
export async function POST(request: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureD1Tables();
    const body = await request.json();
    const action = body.action;

    // ── HEARTBEAT: Update online status ──
    if (action === 'heartbeat') {
      await executeD1(
        `INSERT INTO user_online_status (user_id, last_heartbeat, is_online) 
         VALUES (?, datetime('now'), 1) 
         ON CONFLICT(user_id) DO UPDATE SET last_heartbeat = datetime('now'), is_online = 1`,
        [auth.userId]
      );
      return NextResponse.json({ success: true });
    }

    // ── CREATE ROOM: Challenge a friend ──
    if (action === 'create') {
      const { opponentId } = body;
      if (!opponentId) {
        return NextResponse.json({ error: 'opponentId is required' }, { status: 400 });
      }

      if (opponentId === auth.userId) {
        return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 });
      }

      // Check for existing active room between these two players
      const existingRooms = await queryD1(
        `SELECT id FROM battle_rooms 
         WHERE status IN ('waiting', 'ready', 'in_progress')
         AND ((challenger_id = ? AND opponent_id = ?) OR (challenger_id = ? AND opponent_id = ?))
         LIMIT 1`,
        [auth.userId, opponentId, opponentId, auth.userId]
      );

      if (existingRooms && existingRooms.length > 0) {
        return NextResponse.json({ 
          success: true, 
          roomId: (existingRooms[0] as any).id,
          message: 'Existing battle room found'
        });
      }

      // Get challenger info
      const challengerRows = await queryD1(
        'SELECT id, name, locked_course_id FROM users WHERE id = ? LIMIT 1',
        [auth.userId]
      );
      const challenger = challengerRows?.[0] as any;
      if (!challenger) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Get opponent info
      const opponentRows = await queryD1(
        'SELECT id, name FROM users WHERE id = ? LIMIT 1',
        [opponentId]
      );
      const opponent = opponentRows?.[0] as any;
      if (!opponent) {
        return NextResponse.json({ error: 'Opponent not found' }, { status: 404 });
      }

      // Pick 5 random questions from the challenger's course
      const courseId = challenger.locked_course_id || '';
      let questions: any[] = [];

      if (courseId) {
        const allQuestions = await queryD1(
          'SELECT id, question_text, options_json, correct_option, topic_tag, subject FROM questions WHERE course_id = ? AND is_active = 1',
          [courseId]
        );
        if (allQuestions && allQuestions.length >= 5) {
          questions = shuffleArray(allQuestions).slice(0, BATTLE_CONFIG.TOTAL_QUESTIONS);
        } else if (allQuestions && allQuestions.length > 0) {
          questions = shuffleArray(allQuestions).slice(0, Math.min(allQuestions.length, BATTLE_CONFIG.TOTAL_QUESTIONS));
        }
      }

      // Fallback: if no course-specific questions, get any active questions
      if (questions.length === 0) {
        const anyQuestions = await queryD1(
          'SELECT id, question_text, options_json, correct_option, topic_tag, subject FROM questions WHERE is_active = 1 LIMIT 50'
        );
        if (anyQuestions && anyQuestions.length > 0) {
          questions = shuffleArray(anyQuestions).slice(0, BATTLE_CONFIG.TOTAL_QUESTIONS);
        }
      }

      if (questions.length === 0) {
        return NextResponse.json({ error: 'No questions available for battle' }, { status: 400 });
      }

      const roomId = generateRoomId();
      const questionIds = questions.map((q: any) => q.id);
      const expiresAt = new Date(Date.now() + BATTLE_CONFIG.ROOM_EXPIRY_MINUTES * 60 * 1000).toISOString();

      await executeD1(
        `INSERT INTO battle_rooms (id, challenger_id, challenger_name, opponent_id, opponent_name, status, course_id, question_ids_json, questions_data_json, expires_at)
         VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?, ?, ?)`,
        [
          roomId,
          auth.userId,
          challenger.name || 'Challenger',
          opponentId,
          opponent.name || 'Opponent',
          courseId,
          JSON.stringify(questionIds),
          JSON.stringify(questions.map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            options_json: q.options_json,
            correct_option: q.correct_option,
            topic_tag: q.topic_tag || '',
            subject: q.subject || '',
          }))),
          expiresAt,
        ]
      );

      return NextResponse.json({ success: true, roomId, message: `Battle challenge sent to ${opponent.name}!` });
    }

    // ── DECLINE: Decline a battle challenge ──
    if (action === 'decline') {
      const { roomId } = body;
      if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 });

      await executeD1(
        "UPDATE battle_rooms SET status = 'expired' WHERE id = ? AND opponent_id = ? AND status = 'waiting'",
        [roomId, auth.userId]
      );
      return NextResponse.json({ success: true, message: 'Challenge declined' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[Battle API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Check for pending challenges or get online friends
export async function GET(request: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureD1Tables();
    const { searchParams } = new URL(request.url);
    const check = searchParams.get('check');

    // ── CHECK PENDING CHALLENGES: Incoming battle invites ──
    if (check === 'pending') {
      const pendingBattles = await queryD1(
        `SELECT id, challenger_id, challenger_name, created_at, expires_at 
         FROM battle_rooms 
         WHERE opponent_id = ? AND status = 'waiting' 
         ORDER BY created_at DESC LIMIT 5`,
        [auth.userId]
      );

      // Also expire old rooms
      await executeD1(
        "UPDATE battle_rooms SET status = 'expired' WHERE status = 'waiting' AND expires_at < datetime('now')"
      );

      return NextResponse.json({
        pendingBattles: (pendingBattles || []).filter((b: any) => {
          const expires = new Date(b.expires_at).getTime();
          return expires > Date.now();
        }),
      });
    }

    // ── GET ONLINE STATUS for specific users ──
    if (check === 'online') {
      const userIdsStr = searchParams.get('userIds') || '';
      const userIds = userIdsStr.split(',').filter(Boolean);
      
      if (userIds.length === 0) {
        return NextResponse.json({ onlineUsers: {} });
      }

      const placeholders = userIds.map(() => '?').join(',');
      const statuses = await queryD1(
        `SELECT user_id, last_heartbeat FROM user_online_status WHERE user_id IN (${placeholders})`,
        userIds
      );

      const onlineMap: Record<string, boolean> = {};
      const now = Date.now();
      (statuses || []).forEach((s: any) => {
        const lastBeat = new Date(s.last_heartbeat).getTime();
        onlineMap[s.user_id] = (now - lastBeat) < BATTLE_CONFIG.ONLINE_THRESHOLD_SECONDS * 1000;
      });

      return NextResponse.json({ onlineUsers: onlineMap });
    }

    return NextResponse.json({ error: 'Missing check parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('[Battle GET Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
