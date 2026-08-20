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

const normalizeQuestionSignature = (qText: string): string => {
  if (!qText || typeof qText !== 'string') return '';
  return qText
    .toLowerCase()
    .replace(/^(?:q(?:uestion)?[\s\.\:\-]*\d*[\s\.\:\-]+|\d+[\s\.\:\-]+)/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const deduplicateQuestions = (list: any[]): any[] => {
  const seenIds = new Set<string>();
  const seenSigs = new Set<string>();
  const uniqueList: any[] = [];

  for (const q of (list || [])) {
    if (!q) continue;
    const qId = String(q._id || q.id || '');
    const sig = normalizeQuestionSignature(q.question_text || '');

    if (qId && seenIds.has(qId)) continue;
    if (sig && seenSigs.has(sig)) continue;

    if (qId) seenIds.add(qId);
    if (sig) seenSigs.add(sig);
    uniqueList.push(q);
  }
  return uniqueList;
};

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

          const idAttemptMap: Record<string, boolean> = {};
          const sigAttemptMap: Record<string, boolean> = {};

          (attempts || []).forEach((att: any) => {
            let responses: any[] = [];
            try {
              responses = typeof att.responses_json === 'string' ? JSON.parse(att.responses_json) : (att.responses_json || []);
            } catch (_) {}
            responses.forEach((resp: any) => {
              if (resp.question_id) {
                const qId = String(resp.question_id);
                const isCorrect = Boolean(resp.is_correct);
                idAttemptMap[qId] = isCorrect;
              }
            });
          });

          // Fetch all questions under this course
          const allCourseQs = await queryD1('SELECT * FROM questions WHERE course_id = ? AND (is_active IS NULL OR is_active != 0)', [testCourseId]);

          (allCourseQs || []).forEach((q: any) => {
            const qId = String(q.id || q._id);
            if (idAttemptMap[qId] !== undefined) {
              const sig = normalizeQuestionSignature(q.question_text);
              if (sig) sigAttemptMap[sig] = idAttemptMap[qId];
            }
          });

          const getQuestionStatus = (q: any): 'wrong' | 'unattempted' | 'correct' => {
            const qId = String(q?._id || q?.id || '');
            const sig = normalizeQuestionSignature(q?.question_text || '');

            if (qId && idAttemptMap[qId] !== undefined) {
              return idAttemptMap[qId] ? 'correct' : 'wrong';
            }
            if (sig && sigAttemptMap[sig] !== undefined) {
              return sigAttemptMap[sig] ? 'correct' : 'wrong';
            }
            return 'unattempted';
          };

          for (const [sub, count] of Object.entries(subjectAllocations)) {
            const targetCount = Number(count || 0);
            if (targetCount <= 0) continue;

            const subLower = sub.toLowerCase().trim();
            const matchingQs = deduplicateQuestions(
              (allCourseQs || [])
                .filter((q: any) => {
                  const qSub = (q.subject || '').toLowerCase().trim();
                  const tag = (q.topic_tag || '').toLowerCase().trim();
                  return qSub === subLower || tag.startsWith(subLower) || tag.includes(subLower);
                })
                .map(formatQuestion)
            );

            const wrongQs = matchingQs.filter((q: any) => getQuestionStatus(q) === 'wrong');
            const unattemptedQs = matchingQs.filter((q: any) => getQuestionStatus(q) === 'unattempted');
            const correctQs = matchingQs.filter((q: any) => getQuestionStatus(q) === 'correct');

            // Priority 1: Wrong questions repeat continuously so student can correct mistakes
            const selectedWrong = seededOrRandomShuffle(wrongQs);

            // Priority 2: Fresh unattempted questions
            const remainingNeeded = Math.max(0, targetCount - selectedWrong.length);
            const selectedUnattempted = seededOrRandomShuffle(unattemptedQs).slice(0, remainingNeeded);

            // Priority 3: Correct questions only if needed to fill targetCount
            const stillNeeded = Math.max(0, targetCount - (selectedWrong.length + selectedUnattempted.length));
            const selectedCorrect = stillNeeded > 0 ? seededOrRandomShuffle(correctQs).slice(0, stillNeeded) : [];

            const assembledPool = [
              ...selectedWrong,
              ...selectedUnattempted,
              ...selectedCorrect,
            ];

            const subSelected = deduplicateQuestions(assembledPool).slice(0, targetCount);
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
            const loadedQs = qIds
              .map((qId) => {
                const q = (d1Qs || []).find((item: any) => item.id === qId || String(item.id) === String(qId));
                return q ? formatQuestion(q) : null;
              })
              .filter(Boolean);
            orderedQs = deduplicateQuestions(loadedQs);
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
    const rawQuestions = (rawTest.question_ids || []).map((qId: string) => (db.questions || []).find((q) => q._id === qId || q.id === qId)).filter(Boolean);
    const question_ids = deduplicateQuestions(rawQuestions);

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
