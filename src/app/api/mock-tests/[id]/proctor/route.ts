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

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user } = authResult;
    const userId = String(user._id || user.id || auth.userId);
    const testId = params.id;
    const userEmail = String(user.email || auth.email || '').toLowerCase();

    const body = await req.json().catch(() => ({}));
    const { reason = 'window_blur', timeLeftSeconds, currentQuestionIndex, userResponses } = body;

    // Check Cloudflare D1
    let session: any = null;
    try {
      const rows = await queryD1(
        `SELECT * FROM mock_test_sessions 
         WHERE (student_id = ? OR student_id = ?) 
           AND test_id = ? 
           AND status = 'in_progress' 
         ORDER BY started_at DESC LIMIT 1`,
        [userId, userEmail, testId]
      );
      if (rows && rows.length > 0) {
        session = rows[0];
      }
    } catch (e) {
      console.warn('[api/mock-tests/proctor] D1 session query error:', e);
    }

    // Fallback to sharedDb if D1 has no active session
    if (!session) {
      const db = readSharedDb();
      session = (db.mock_test_sessions || []).find(
        (s: any) =>
          (String(s.student_id) === userId || String(s.student_id).toLowerCase() === userEmail) &&
          String(s.test_id) === testId &&
          s.status === 'in_progress'
      );
    }

    if (!session) {
      // If no active session was found, create one on the fly with 1 strike
      const sessionId = generateId();
      session = {
        id: sessionId,
        student_id: userId,
        test_id: testId,
        status: 'in_progress',
        resume_count: 1,
        max_resumes: 3,
        focus_violation_count: 1,
        max_focus_violations: 3,
        time_left_seconds: Number(timeLeftSeconds || 3600),
        user_responses_json: JSON.stringify(userResponses || {}),
        current_question_index: Number(currentQuestionIndex || 0),
        started_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        proctoring_strikes_json: JSON.stringify([{ timestamp: new Date().toISOString(), reason }]),
      };

      try {
        await executeD1(
          `INSERT INTO mock_test_sessions 
           (id, student_id, test_id, course_id, status, resume_count, max_resumes, focus_violation_count, max_focus_violations, time_left_seconds, user_responses_json, current_question_index, started_at, last_heartbeat_at, proctoring_strikes_json)
           VALUES (?, ?, ?, ?, 'in_progress', 1, 3, 1, 3, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)`,
          [
            sessionId,
            userId,
            testId,
            String(user.locked_course_id || ''),
            Number(timeLeftSeconds || 3600),
            JSON.stringify(userResponses || {}),
            Number(currentQuestionIndex || 0),
            JSON.stringify([{ timestamp: new Date().toISOString(), reason }]),
          ]
        );
      } catch (e) {
        console.warn('[api/mock-tests/proctor] D1 session insert error:', e);
      }

      try {
        const db = readSharedDb();
        if (!db.mock_test_sessions) db.mock_test_sessions = [];
        db.mock_test_sessions.push(session);
        writeSharedDb(db);
      } catch (_) {}

      return NextResponse.json({
        success: true,
        terminated: false,
        strikesCount: 1,
        maxStrikes: 3,
        strikesRemaining: 2,
        reason,
        message: 'Security Alert: Strike 1 of 3. You switched tabs or left the exam window. At 3 strikes, the test automatically submits!',
      });
    }

    // Increment strike count
    const currentStrikes = Number(session.focus_violation_count || 0);
    const newStrikesCount = currentStrikes + 1;
    const isTerminated = newStrikesCount >= 3;

    let strikesLog: any[] = [];
    try {
      strikesLog = typeof session.proctoring_strikes_json === 'string'
        ? JSON.parse(session.proctoring_strikes_json)
        : (session.proctoring_strikes_json || []);
    } catch (_) {
      strikesLog = [];
    }
    strikesLog.push({ timestamp: new Date().toISOString(), reason, strike: newStrikesCount });

    const newStatus = isTerminated ? 'submitted' : 'in_progress';
    const terminationReason = isTerminated ? 'focus_strikes_exhausted' : null;

    // Update D1
    try {
      await executeD1(
        `UPDATE mock_test_sessions 
         SET focus_violation_count = ?,
             status = ?,
             termination_reason = ?,
             submitted_at = CASE WHEN ? = 'submitted' THEN CURRENT_TIMESTAMP ELSE submitted_at END,
             time_left_seconds = COALESCE(?, time_left_seconds),
             current_question_index = COALESCE(?, current_question_index),
             user_responses_json = COALESCE(?, user_responses_json),
             proctoring_strikes_json = ?,
             last_heartbeat_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          newStrikesCount,
          newStatus,
          terminationReason,
          newStatus,
          timeLeftSeconds !== undefined ? Number(timeLeftSeconds) : null,
          currentQuestionIndex !== undefined ? Number(currentQuestionIndex) : null,
          userResponses ? JSON.stringify(userResponses) : null,
          JSON.stringify(strikesLog),
          session.id,
        ]
      );
    } catch (e) {
      console.warn('[api/mock-tests/proctor] D1 session update error:', e);
    }

    // Dual-write sharedDb
    try {
      const db = readSharedDb();
      if (!db.mock_test_sessions) db.mock_test_sessions = [];
      const memIdx = db.mock_test_sessions.findIndex((s: any) => String(s.id) === String(session.id));
      const updatedMem = {
        ...session,
        focus_violation_count: newStrikesCount,
        status: newStatus,
        termination_reason: terminationReason,
        submitted_at: isTerminated ? new Date().toISOString() : session.submitted_at,
        time_left_seconds: timeLeftSeconds !== undefined ? Number(timeLeftSeconds) : session.time_left_seconds,
        current_question_index: currentQuestionIndex !== undefined ? Number(currentQuestionIndex) : session.current_question_index,
        user_responses_json: userResponses ? JSON.stringify(userResponses) : session.user_responses_json,
        proctoring_strikes_json: strikesLog,
        last_heartbeat_at: new Date().toISOString(),
      };
      if (memIdx >= 0) {
        db.mock_test_sessions[memIdx] = updatedMem;
      } else {
        db.mock_test_sessions.push(updatedMem);
      }
      writeSharedDb(db);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      terminated: isTerminated,
      strikesCount: newStrikesCount,
      maxStrikes: 3,
      strikesRemaining: Math.max(0, 3 - newStrikesCount),
      reason,
      terminationReason,
      message: isTerminated
        ? 'Maximum screen focus violations reached (3 of 3 strikes). The exam has been locked and automatically submitted.'
        : `Security Alert: Strike ${newStrikesCount} of 3. You switched tabs or left the exam window. At 3 strikes, the test automatically submits!`,
    });
  } catch (error: any) {
    console.error('[api/mock-tests/proctor] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
