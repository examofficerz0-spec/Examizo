import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { getEquivalentCourseIds } from '@/lib/courseMatcher';
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
      return NextResponse.json({ error: 'User deleted or not found' }, { status: 401 });
    }

    const { user } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ tests: [], needsCourseSelection: true }, { status: 200 });
    }

    const rawCourseId = user.locked_course_id;
    const courseId = typeof rawCourseId === 'object'
      ? String((rawCourseId as any)?._id || (rawCourseId as any)?.id || '')
      : String(rawCourseId);

    // 1. Primary: Cloudflare D1
    try {
      const d1Courses = await queryD1('SELECT * FROM courses');
      const validCourseIds = getEquivalentCourseIds(courseId, d1Courses || []);
      const searchCourseIds = validCourseIds.length > 0 ? validCourseIds : [courseId];

      const placeholders = searchCourseIds.map(() => '?').join(',');
      const currentSubProfileId = String(user._id || user.id || auth.userId);
      const userAliases = [
        currentSubProfileId,
        String(auth.userId || ''),
        String(user.email || '').toLowerCase(),
        String(user.account_email || '').toLowerCase(),
      ].filter(Boolean);
      const placeholdersUser = userAliases.map(() => '?').join(',');

      let d1UserAttempts: any[] = [];
      try {
        d1UserAttempts = (await queryD1(
          `SELECT id, test_id, score, accuracy, submitted_at FROM attempts WHERE student_id IN (${placeholdersUser}) OR sub_profile_id IN (${placeholdersUser})`,
          [...userAliases, ...userAliases]
        )) || [];

        const db = readSharedDb();
        const memAtts = (db.attempts || []).filter(
          (a: any) =>
            userAliases.includes(String(a.student_id)) ||
            userAliases.includes(String(a.sub_profile_id))
        );
        const existingIds = new Set(d1UserAttempts.map((item: any) => String(item.id || item._id)));
        memAtts.forEach((a: any) => {
          const aId = String(a._id || a.id);
          if (!existingIds.has(aId)) {
            d1UserAttempts.push(a);
            existingIds.add(aId);
          }
        });
      } catch (_) {}

      const d1Tests = await queryD1(
        `SELECT * FROM mock_tests WHERE course_id IN (${placeholders}) AND is_active = 1 ORDER BY created_at DESC`,
        searchCourseIds
      );

      if (d1Tests && d1Tests.length > 0) {
        const tests = await Promise.all(
          d1Tests.map(async (m: any) => {
            let qIds: string[] = [];
            try {
              qIds = typeof m.question_ids_json === 'string' ? JSON.parse(m.question_ids_json) : (m.question_ids_json || []);
            } catch (e) {
              qIds = [];
            }

            let qs: any[] = [];
            if (qIds.length > 0) {
              try {
                const quotedIds = qIds.map((id) => `'${id}'`).join(',');
                const d1Qs = await queryD1(`SELECT * FROM questions WHERE id IN (${quotedIds})`);
                qs = (d1Qs || []).map((q: any) => {
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
              } catch (qErr) {
                console.warn('[api/mock-tests] Question fetch error:', qErr);
              }
            }

            const testAttempts = d1UserAttempts.filter((a: any) => String(a.test_id) === String(m.id));
            const attemptsCount = testAttempts.length;
            const highestScore = testAttempts.reduce((max: number, a: any) => Math.max(max, Number(a.score || 0)), 0);
            const isAttempted = attemptsCount > 0;

            return {
              _id: m.id,
              id: m.id,
              course_id: m.course_id,
              title: m.title,
              type: m.type || 'full',
              duration_minutes: Number(m.duration_minutes || 60),
              cutoff_marks: Number(m.cutoff_marks || 0),
              question_ids: qs,
              questions_count: qIds.length,
              attempts_count: attemptsCount,
              attemptsCount,
              max_attempts: 3,
              maxAttempts: 3,
              highest_score: highestScore,
              is_attempted: isAttempted,
              is_active: m.is_active !== 0,
            };
          })
        );

        return NextResponse.json({ tests });
      }
    } catch (d1Err) {
      console.warn('[api/mock-tests] D1 query fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const currentSubProfileId = String(user._id || user.id || auth.userId);
    const validCourseIds = getEquivalentCourseIds(courseId, db.courses || []);
    const userAttempts = (db.attempts || []).filter(
      (a: any) =>
        String(a.student_id) === currentSubProfileId ||
        String(a.sub_profile_id) === currentSubProfileId ||
        (user.email && String(a.student_id) === String(user.email)) ||
        (user.account_email && String(a.student_id) === String(user.account_email))
    );

    const tests = (db.mockTests || [])
      .filter((m: any) => {
        const testCourseId = String(typeof m.course_id === 'object' ? (m.course_id?._id || m.course_id?.id) : m.course_id);
        return (validCourseIds.includes(testCourseId) || validCourseIds.includes(String(m.course_id))) && m.is_active !== false;
      })
      .map((m: any) => {
        const qList = (m.question_ids || [])
          .map((qId: any) => {
            const idStr = typeof qId === 'object' ? String(qId._id || qId.id) : String(qId);
            return (db.questions || []).find((q: any) => String(q._id || q.id) === idStr);
          })
          .filter(Boolean);

        const testAttempts = userAttempts.filter((a: any) => String(a.test_id || a.mock_test_id) === String(m._id || m.id));
        const attemptsCount = testAttempts.length;
        const highestScore = testAttempts.reduce((max: number, a: any) => Math.max(max, Number(a.score || 0)), 0);
        const isAttempted = attemptsCount > 0;

        return {
          ...m,
          question_ids: qList,
          attempts_count: attemptsCount,
          attemptsCount,
          max_attempts: 3,
          maxAttempts: 3,
          highest_score: highestScore,
          is_attempted: isAttempted,
        };
      });

    return NextResponse.json({ tests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
