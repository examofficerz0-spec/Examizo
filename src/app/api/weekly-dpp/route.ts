import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { WeeklyDPP, User, Course, Question } from '@/lib/models';
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
      return NextResponse.json({ weeklyDpps: [] });
    }

    const userCourseId = typeof user.locked_course_id === 'object' && user.locked_course_id?._id ? String(user.locked_course_id._id) : String(user.locked_course_id);

    // 1. Try D1 first
    try {
      const d1Dpps = await queryD1('SELECT * FROM weekly_dpps WHERE course_id = ? AND is_active = 1 ORDER BY created_at DESC', [userCourseId]);
      if (d1Dpps) {
        const formatted = await Promise.all(
          d1Dpps.map(async (d: any) => {
            let qIds: string[] = [];
            try {
              qIds = typeof d.question_ids_json === 'string' ? JSON.parse(d.question_ids_json) : (d.question_ids_json || []);
            } catch (e) {
              qIds = [];
            }

            let questions: any[] = [];
            if (qIds.length > 0) {
              const quoted = qIds.map((id) => `'${id}'`).join(',');
              const d1Qs = await queryD1(`SELECT * FROM questions WHERE id IN (${quoted})`);
              questions = (d1Qs || []).map((q: any) => {
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
            }

            return {
              _id: d.id,
              id: d.id,
              course_id: d.course_id,
              title: d.title,
              duration_minutes: d.duration_minutes,
              question_ids: qIds,
              questions,
              created_at: d.created_at,
            };
          })
        );

        return NextResponse.json({ weeklyDpps: formatted });
      }
    } catch (d1Err) {
      console.warn('[api/weekly-dpp] D1 query fallback:', d1Err);
    }

    // 2. Memory Mode Fallback
    if (isMemoryMode) {
      const db = readSharedDb();
      const validCourseIds = getEquivalentCourseIds(userCourseId, db.courses || []);
      const dpps = (db.weeklyDpps || []).filter((d) => {
        const dppCourseId = String(typeof d.course_id === 'object' ? d.course_id?._id : d.course_id);
        return validCourseIds.includes(dppCourseId) && d.is_active !== false;
      });

      const populated = dpps.map((d) => {
        const dppQuestions = (db.questions || []).filter((q) => (d.question_ids || []).includes(q._id));
        return {
          ...d,
          questions: dppQuestions,
        };
      });

      return NextResponse.json({ weeklyDpps: populated });
    }

    // 3. Mongoose Mode Fallback
    await dbConnect();
    const allCourses = await Course.find({});
    const validCourseIds = getEquivalentCourseIds(userCourseId, allCourses);

    const dpps = await WeeklyDPP.find({
      course_id: { $in: validCourseIds },
      is_active: true,
    }).populate('question_ids');

    const formatted = dpps.map((d) => ({
      _id: d._id.toString(),
      course_id: d.course_id.toString(),
      title: d.title,
      duration_minutes: d.duration_minutes,
      question_ids: (d.question_ids || []).map((q: any) => q._id?.toString() || q.toString()),
      questions: d.question_ids || [],
      created_at: d.created_at,
    }));

    return NextResponse.json({ weeklyDpps: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
