import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1, executeD1, ensureD1Tables } from '@/lib/d1';
import { readSharedDb, writeSharedDb, generateId } from '@/lib/sharedDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to get active session from D1 or sharedDb
async function getActiveSession(studentId: string, testId: string) {
  try {
    const rows = await queryD1(
      `SELECT * FROM mock_test_sessions 
       WHERE (student_id = ? OR sub_profile_id = ?) 
         AND test_id = ? 
         AND status = 'in_progress' 
       ORDER BY started_at DESC LIMIT 1`,
      [studentId, studentId, testId]
    );
    if (rows && rows.length > 0) return rows[0];
  } catch (err) {
    console.warn('[Session API] D1 lookup error:', err);
  }

  // Memory fallback
  const db = readSharedDb();
  const sessions = db.mock_test_sessions || [];
  return sessions.find(
    (s: any) =>
      (String(s.student_id) === String(studentId) || String(s.sub_profile_id) === String(studentId)) &&
      String(s.test_id) === String(testId) &&
      s.status === 'in_progress'
  ) || null;
}

// GET: Check active session for this test
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureD1Tables();
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = String(authResult.user._id || authResult.user.id || auth.userId);
    const session = await getActiveSession(userId, params.id);

    if (!session) {
      return NextResponse.json({ session: null });
    }

    // Check if session time has expired
    let elapsedSecs = 0;
    if (session.last_active_at) {
      const lastActiveTime = new Date(session.last_active_at).getTime();
      if (!isNaN(lastActiveTime)) {
        elapsedSecs = Math.max(0, Math.floor((Date.now() - lastActiveTime) / 1000));
      }
    }

    const adjustedTimeLeft = Math.max(0, Number(session.time_left_seconds || 0) - elapsedSecs);

    let parsedResponses = {};
    try {
      parsedResponses = typeof session.user_responses_json === 'string'
        ? JSON.parse(session.user_responses_json)
        : (session.user_responses_json || {});
    } catch (_) {}

    let parsedQuestionOrder = [];
    try {
      parsedQuestionOrder = typeof session.question_order_json === 'string'
        ? JSON.parse(session.question_order_json)
        : (session.question_order_json || []);
    } catch (_) {}

    return NextResponse.json({
      session: {
        id: session.id,
        test_id: session.test_id,
        status: session.status,
        resume_count: Number(session.resume_count || 1),
        focus_violation_count: Number(session.focus_violation_count || 0),
        time_left_seconds: adjustedTimeLeft,
        current_question_index: Number(session.current_question_index || 0),
        user_responses: parsedResponses,
        question_order: parsedQuestionOrder,
        active_language: session.active_language || 'en',
        is_practice_retake: Boolean(session.is_practice_retake),
        started_at: session.started_at,
        last_active_at: session.last_active_at,
      },
    });
  } catch (err: any) {
    console.error('[Session GET Error]:', err);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

// POST: Start or Resume session
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureD1Tables();
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = String(authResult.user._id || authResult.user.id || auth.userId);
    const body = await req.json();
    const { action, durationSeconds, questionOrder, activeLanguage, isRetake } = body;

    const existingSession = await getActiveSession(userId, params.id);

    if (action === 'resume') {
      if (!existingSession) {
        return NextResponse.json({
          success: false,
          terminated: false,
          error: 'No active session found to resume',
          session: null,
        });
      }

      // Calculate elapsed disconnection time
      let elapsedSecs = 0;
      if (existingSession.last_active_at) {
        const lastActiveTime = new Date(existingSession.last_active_at).getTime();
        if (!isNaN(lastActiveTime)) {
          elapsedSecs = Math.max(0, Math.floor((Date.now() - lastActiveTime) / 1000));
        }
      }

      const newTimeLeft = Math.max(0, Number(existingSession.time_left_seconds || 0) - elapsedSecs);
      const newResumeCount = Number(existingSession.resume_count || 1) + 1;

      // ─── RULE 1: Max 3 Resumes Limit (Whichever fills first auto-submits) ───
      if (newResumeCount > 3) {
        // Mark session as submitted/terminated due to exceeded resumes
        await executeD1(
          `UPDATE mock_test_sessions 
           SET status = 'submitted', submitted_at = datetime('now'), resume_count = ?
           WHERE id = ?`,
          [newResumeCount, existingSession.id]
        );

        // Memory fallback
        const db = readSharedDb();
        const memSession = (db.mock_test_sessions || []).find((s: any) => s.id === existingSession.id);
        if (memSession) {
          memSession.status = 'submitted';
          memSession.resume_count = newResumeCount;
          memSession.submitted_at = new Date().toISOString();
          writeSharedDb(db);
        }

        return NextResponse.json({
          success: false,
          terminated: true,
          reason: 'exceeded_resumes',
          message: 'Security lockdown: You have exceeded the maximum limit of 3 session resumes. Your exam has been automatically submitted.',
        });
      }

      // If time expired during disconnection
      if (newTimeLeft <= 1) {
        await executeD1(
          `UPDATE mock_test_sessions 
           SET status = 'submitted', submitted_at = datetime('now'), time_left_seconds = 0
           WHERE id = ?`,
          [existingSession.id]
        );
        return NextResponse.json({
          success: false,
          terminated: true,
          reason: 'time_expired',
          message: 'Examination time has expired while disconnected. Saved answers have been submitted.',
        });
      }

      // Valid Resume: Update SQL session
      await executeD1(
        `UPDATE mock_test_sessions 
         SET resume_count = ?, time_left_seconds = ?, last_active_at = datetime('now')
         WHERE id = ?`,
        [newResumeCount, newTimeLeft, existingSession.id]
      );

      // Memory fallback
      const db = readSharedDb();
      const memSession = (db.mock_test_sessions || []).find((s: any) => s.id === existingSession.id);
      if (memSession) {
        memSession.resume_count = newResumeCount;
        memSession.time_left_seconds = newTimeLeft;
        memSession.last_active_at = new Date().toISOString();
        writeSharedDb(db);
      }

      let parsedResponses = {};
      try {
        parsedResponses = typeof existingSession.user_responses_json === 'string'
          ? JSON.parse(existingSession.user_responses_json)
          : (existingSession.user_responses_json || {});
      } catch (_) {}

      let parsedQuestionOrder = [];
      try {
        parsedQuestionOrder = typeof existingSession.question_order_json === 'string'
          ? JSON.parse(existingSession.question_order_json)
          : (existingSession.question_order_json || []);
      } catch (_) {}

      return NextResponse.json({
        success: true,
        session: {
          id: existingSession.id,
          test_id: existingSession.test_id,
          status: 'in_progress',
          resume_count: newResumeCount,
          focus_violation_count: Number(existingSession.focus_violation_count || 0),
          time_left_seconds: newTimeLeft,
          current_question_index: Number(existingSession.current_question_index || 0),
          user_responses: parsedResponses,
          question_order: parsedQuestionOrder,
          active_language: existingSession.active_language || 'en',
          is_practice_retake: Boolean(existingSession.is_practice_retake),
        },
      });
    }

    // Action === 'start' (fresh session or fresh retake)
    // 1. Close any older in_progress sessions for this test
    await executeD1(
      `UPDATE mock_test_sessions 
       SET status = 'submitted', submitted_at = datetime('now')
       WHERE (student_id = ? OR sub_profile_id = ?) AND test_id = ? AND status = 'in_progress'`,
      [userId, userId, params.id]
    );

    const sessionId = `sess_${userId}_${params.id}_${Date.now()}`;
    const initialTimeLeft = Math.max(60, Number(durationSeconds || 3600));
    const orderJson = JSON.stringify(Array.isArray(questionOrder) ? questionOrder : []);
    const isRetakeFlag = isRetake ? 1 : 0;

    await executeD1(
      `INSERT INTO mock_test_sessions (
        id, student_id, sub_profile_id, test_id, status, resume_count, focus_violation_count,
        time_left_seconds, current_question_index, user_responses_json, question_order_json,
        active_language, is_practice_retake, started_at, last_active_at
      ) VALUES (?, ?, ?, ?, 'in_progress', 1, 0, ?, 0, '{}', ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        sessionId,
        userId,
        userId,
        params.id,
        initialTimeLeft,
        orderJson,
        activeLanguage || 'en',
        isRetakeFlag,
      ]
    );

    // Memory fallback
    const db = readSharedDb();
    if (!db.mock_test_sessions) db.mock_test_sessions = [];
    db.mock_test_sessions.push({
      id: sessionId,
      student_id: userId,
      sub_profile_id: userId,
      test_id: params.id,
      status: 'in_progress',
      resume_count: 1,
      focus_violation_count: 0,
      time_left_seconds: initialTimeLeft,
      current_question_index: 0,
      user_responses_json: '{}',
      question_order_json: orderJson,
      active_language: activeLanguage || 'en',
      is_practice_retake: isRetakeFlag,
      started_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    });
    writeSharedDb(db);

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        test_id: params.id,
        status: 'in_progress',
        resume_count: 1,
        focus_violation_count: 0,
        time_left_seconds: initialTimeLeft,
        current_question_index: 0,
        user_responses: {},
        question_order: Array.isArray(questionOrder) ? questionOrder : [],
        active_language: activeLanguage || 'en',
        is_practice_retake: Boolean(isRetakeFlag),
      },
    });
  } catch (err: any) {
    console.error('[Session POST Error]:', err);
    return NextResponse.json({ error: 'Failed to initialize session' }, { status: 500 });
  }
}

// PUT: Heartbeat auto-save
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authResult = await getUserFromAuth(auth);
    if (!authResult?.user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userId = String(authResult.user._id || authResult.user.id || auth.userId);
    const { timeLeftSeconds, userResponses, currentIdx } = await req.json();

    const responsesJson = JSON.stringify(userResponses || {});

    await executeD1(
      `UPDATE mock_test_sessions 
       SET time_left_seconds = ?, user_responses_json = ?, current_question_index = ?, last_active_at = datetime('now')
       WHERE (student_id = ? OR sub_profile_id = ?) AND test_id = ? AND status = 'in_progress'`,
      [Number(timeLeftSeconds || 0), responsesJson, Number(currentIdx || 0), userId, userId, params.id]
    );

    // Memory fallback
    const db = readSharedDb();
    const session = (db.mock_test_sessions || []).find(
      (s: any) =>
        (String(s.student_id) === userId || String(s.sub_profile_id) === userId) &&
        String(s.test_id) === String(params.id) &&
        s.status === 'in_progress'
    );
    if (session) {
      session.time_left_seconds = Number(timeLeftSeconds || 0);
      session.user_responses_json = responsesJson;
      session.current_question_index = Number(currentIdx || 0);
      session.last_active_at = new Date().toISOString();
      writeSharedDb(db);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Heartbeat error' }, { status: 500 });
  }
}
