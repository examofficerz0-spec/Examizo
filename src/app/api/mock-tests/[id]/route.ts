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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user, isMemoryMode } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ error: 'No course locked' }, { status: 400 });
    }

    const userCourseId = typeof user.locked_course_id === 'object' && user.locked_course_id?._id ? String(user.locked_course_id._id) : String(user.locked_course_id);

    // 1. Try D1 first
    try {
      const d1Tests = await queryD1('SELECT * FROM mock_tests WHERE id = ? LIMIT 1', [params.id]);
      if (d1Tests && d1Tests.length > 0) {
        const rawTest = d1Tests[0];
        const testCourseId = String(rawTest.course_id);

        let qIds: string[] = [];
        try {
          qIds = typeof rawTest.question_ids_json === 'string' ? JSON.parse(rawTest.question_ids_json) : (rawTest.question_ids_json || []);
        } catch (e) {
          qIds = [];
        }

        let orderedQs: any[] = [];
        if (qIds.length > 0) {
          const quotedIds = qIds.map((id) => `'${id}'`).join(',');
          const d1Qs = await queryD1(`SELECT * FROM questions WHERE id IN (${quotedIds})`);
          orderedQs = qIds
            .map((qId) => {
              const q = (d1Qs || []).find((item: any) => item.id === qId || String(item.id) === String(qId));
              if (!q) return null;
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
                marks: Number(q.marks || 1),
              };
            })
            .filter(Boolean);
        }

        const d1Courses = await queryD1('SELECT * FROM courses WHERE id = ? LIMIT 1', [testCourseId]);
        const courseRow = d1Courses?.[0];
        let subjects = [];
        try {
          subjects = typeof courseRow?.subjects_json === 'string' ? JSON.parse(courseRow.subjects_json) : (courseRow?.subjects_json || []);
        } catch (e) {
          subjects = [];
        }

        const test = {
          _id: rawTest.id,
          id: rawTest.id,
          title: rawTest.title,
          type: rawTest.type,
          duration_minutes: rawTest.duration_minutes,
          cutoff_marks: rawTest.cutoff_marks,
          course_id: courseRow ? { _id: courseRow.id, name: courseRow.name, subjects } : { name: 'Locked Course' },
          question_ids: orderedQs,
        };

        return NextResponse.json({ test });
      }
    } catch (d1Err) {
      console.warn('[api/mock-tests/[id]] D1 fallback:', d1Err);
    }

    // 2. Memory Mode Fallback
    if (isMemoryMode) {
      const db = readSharedDb();
      const rawTest = (db.mockTests || []).find((m) => m._id === params.id || m.id === params.id);
      if (!rawTest) {
        return NextResponse.json({ error: 'Test not found' }, { status: 404 });
      }

      const course = (db.courses || []).find((c) => c._id === rawTest.course_id || c.id === rawTest.course_id);
      const question_ids = (rawTest.question_ids || []).map((qId: string) => (db.questions || []).find((q) => q._id === qId || q.id === qId)).filter(Boolean);

      const test = {
        ...rawTest,
        course_id: course ? { _id: course._id, name: course.name } : { name: 'Locked Course' },
        question_ids,
      };

      return NextResponse.json({ test });
    }

    // 3. Mongoose Fallback
    await dbConnect();
    const rawTest = await MockTest.findById(params.id);
    if (!rawTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const allCourses = await Course.find({});
    const testCourseId = String(typeof rawTest.course_id === 'object' ? (rawTest.course_id as any)?._id : rawTest.course_id);
    const courseObj = allCourses.find((c) => c._id.toString() === testCourseId);
    const rawQIds = (rawTest.question_ids || []).map((q: any) => q._id?.toString() || q.toString());
    const populatedQs = await Question.find({ _id: { $in: rawQIds } });

    const orderedQs = rawQIds
      .map((qId: string) => populatedQs.find((q: any) => q._id.toString() === qId || String(q._id) === qId))
      .filter(Boolean);

    const test = {
      ...rawTest.toObject(),
      course_id: courseObj ? { _id: courseObj._id.toString(), name: courseObj.name, subjects: courseObj.subjects } : { name: 'Locked Course' },
      question_ids: orderedQs,
    };

    return NextResponse.json({ test });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
