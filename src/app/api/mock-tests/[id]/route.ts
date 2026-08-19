import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function seededOrRandomShuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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

    const { user } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ error: 'No course locked' }, { status: 400 });
    }

    const userId = String(user._id || user.id || auth.userId);

    // 1. Primary: Cloudflare D1
    try {
      const d1Tests = await queryD1('SELECT * FROM mock_tests WHERE id = ? LIMIT 1', [params.id]);
      if (d1Tests && d1Tests.length > 0) {
        const rawTest = d1Tests[0];
        const testCourseId = String(rawTest.course_id);

        let subjectAllocations: Record<string, number> = {};
        try {
          subjectAllocations = typeof rawTest.subject_allocations_json === 'string'
            ? JSON.parse(rawTest.subject_allocations_json)
            : (rawTest.subject_allocations_json || {});
        } catch (e) {
          subjectAllocations = {};
        }

        const isDynamic = rawTest.is_dynamic_reshuffle === 1 || Boolean(rawTest.is_dynamic_reshuffle);

        const formatQuestion = (q: any) => {
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
            subject: q.subject || (q.topic_tag && q.topic_tag.includes('-') ? q.topic_tag.split('-')[0].trim() : 'General'),
            options: opts,
            correct_option: Number(q.correct_option || 0),
            explanation: q.explanation || '',
            detailed_explanation: q.detailed_explanation || '',
            topic_tag: q.topic_tag || 'General',
            marks: Number(q.marks || 1),
          };
        };

        let orderedQs: any[] = [];

        // Check if dynamic preset reshuffle is active with subject allocations
        if (isDynamic && Object.keys(subjectAllocations).length > 0) {
          const attempts = await queryD1(
            'SELECT responses_json FROM attempts WHERE (student_id = ? OR student_id = ?) ORDER BY started_at ASC',
            [userId, String(auth.email || '')]
          );

          const questionAttemptMap: Record<string, boolean> = {};
          (attempts || []).forEach((att: any) => {
            let responses: any[] = [];
            try {
              responses = typeof att.responses_json === 'string' ? JSON.parse(att.responses_json) : (att.responses_json || []);
            } catch (_) {}
            responses.forEach((resp: any) => {
              if (resp.question_id) {
                questionAttemptMap[String(resp.question_id)] = Boolean(resp.is_correct);
              }
            });
          });

          // Fetch all questions under this course
          const allCourseQs = await queryD1('SELECT * FROM questions WHERE course_id = ? AND (is_active IS NULL OR is_active != 0)', [testCourseId]);

          for (const [sub, count] of Object.entries(subjectAllocations)) {
            const targetCount = Number(count || 0);
            if (targetCount <= 0) continue;

            const subLower = sub.toLowerCase().trim();
            const matchingQs = (allCourseQs || [])
              .filter((q: any) => {
                const qSub = (q.subject || '').toLowerCase().trim();
                const tag = (q.topic_tag || '').toLowerCase().trim();
                return qSub === subLower || tag.startsWith(subLower) || tag.includes(subLower);
              })
              .map(formatQuestion);

            const wrongQs = matchingQs.filter((q: any) => questionAttemptMap[String(q.id)] === false);
            const unattemptedQs = matchingQs.filter((q: any) => questionAttemptMap[String(q.id)] === undefined);
            const correctQs = matchingQs.filter((q: any) => questionAttemptMap[String(q.id)] === true);

            const assembledPool = [
              ...seededOrRandomShuffle(wrongQs),
              ...seededOrRandomShuffle(unattemptedQs),
              ...seededOrRandomShuffle(correctQs),
            ];

            const seen = new Set<string>();
            const subSelected: any[] = [];
            for (const q of assembledPool) {
              if (!seen.has(String(q.id))) {
                seen.add(String(q.id));
                subSelected.push(q);
                if (subSelected.length >= targetCount) break;
              }
            }

            orderedQs.push(...subSelected);
          }
        }

        // Fallback to static question IDs
        if (orderedQs.length === 0) {
          let qIds: string[] = [];
          try {
            qIds = typeof rawTest.question_ids_json === 'string' ? JSON.parse(rawTest.question_ids_json) : (rawTest.question_ids_json || []);
          } catch (e) {
            qIds = [];
          }

          if (qIds.length > 0) {
            const quotedIds = qIds.map((id) => `'${id}'`).join(',');
            const d1Qs = await queryD1(`SELECT * FROM questions WHERE id IN (${quotedIds})`);
            orderedQs = qIds
              .map((qId) => {
                const q = (d1Qs || []).find((item: any) => item.id === qId || String(item.id) === String(qId));
                return q ? formatQuestion(q) : null;
              })
              .filter(Boolean);
          }
        }

        const d1Courses = await queryD1('SELECT * FROM courses WHERE id = ? LIMIT 1', [testCourseId]);
        const courseRow = d1Courses?.[0];
        let subjects: string[] = [];
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
          is_dynamic_reshuffle: isDynamic,
          subject_allocations: subjectAllocations,
          course_id: courseRow ? { _id: courseRow.id, name: courseRow.name, subjects } : { name: 'Locked Course' },
          question_ids: orderedQs,
        };

        return NextResponse.json({ test });
      }
    } catch (d1Err) {
      console.warn('[api/mock-tests/[id]] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
