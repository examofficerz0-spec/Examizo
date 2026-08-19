import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User, MockTest, Course, Question } from '@/lib/models';
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
      const res = NextResponse.json({ error: 'User deleted or not found' }, { status: 401 });
      res.cookies.set('student_token', '', { httpOnly: true, maxAge: 0, path: '/' });
      return res;
    }

    const { user, isMemoryMode } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ error: 'No course locked' }, { status: 400 });
    }

    const rawCourseId = user.locked_course_id;
    const courseId = typeof rawCourseId === 'object'
      ? String((rawCourseId as any)?._id || (rawCourseId as any)?.id || '')
      : String(rawCourseId);

    // 1. Try D1 first
    try {
      // Load all courses to find equivalent course IDs for this student's track
      const d1Courses = await queryD1('SELECT * FROM courses');
      const validCourseIds = getEquivalentCourseIds(courseId, d1Courses || []);
      const searchCourseIds = validCourseIds.length > 0 ? validCourseIds : [courseId];

      const placeholders = searchCourseIds.map(() => '?').join(',');
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
              is_active: m.is_active !== 0,
            };
          })
        );

        return NextResponse.json({ tests });
      }
    } catch (d1Err) {
      console.warn('[api/mock-tests] D1 query fallback:', d1Err);
    }

    // 2. Memory Mode Fallback
    if (isMemoryMode) {
      const db = readSharedDb();
      const validCourseIds = getEquivalentCourseIds(courseId, db.courses || []);

      const tests = (db.mockTests || [])
        .filter((m) => {
          const testCourseId = String(typeof m.course_id === 'object' ? m.course_id?._id : m.course_id);
          return validCourseIds.includes(testCourseId) && m.is_active !== false;
        })
        .map((m) => {
          const qList = (m.question_ids || []).map((qId: string) => (db.questions || []).find((q) => q._id === qId)).filter(Boolean);
          return { ...m, question_ids: qList };
        });

      return NextResponse.json({ tests });
    }

    // 3. Mongoose Fallback
    await dbConnect();
    const allCourses = await Course.find({});
    const validCourseIds = getEquivalentCourseIds(courseId, allCourses);

    const rawTests = await MockTest.find({
      course_id: { $in: validCourseIds },
      is_active: true,
    });

    const tests = await Promise.all(
      rawTests.map(async (m) => {
        const rawQIds = (m.question_ids || []).map((q: any) => q._id?.toString() || q.toString());
        const qs = await Question.find({ _id: { $in: rawQIds } });
        return {
          ...m.toObject(),
          question_ids: qs,
        };
      })
    );

    return NextResponse.json({ tests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
