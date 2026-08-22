import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { getEquivalentCourseIds } from '@/lib/courseMatcher';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      return NextResponse.json({ weeklyDpps: [] });
    }

    const userCourseId = typeof user.locked_course_id === 'object' && user.locked_course_id?._id ? String(user.locked_course_id._id) : String(user.locked_course_id);

    // 1. Primary: Cloudflare D1
    try {
      const d1Dpps = await queryD1('SELECT * FROM weekly_dpps WHERE course_id = ? AND (is_active IS NULL OR is_active != 0) ORDER BY created_at DESC', [userCourseId]);
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
              const loaded = (d1Qs || []).map((q: any) => {
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
              questions = deduplicateQuestions(loaded);
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

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const validCourseIds = getEquivalentCourseIds(userCourseId, db.courses || []);
    const dpps = (db.weeklyDpps || []).filter((d) => {
      const dppCourseId = String(typeof d.course_id === 'object' ? d.course_id?._id : d.course_id);
      return validCourseIds.includes(dppCourseId) && d.is_active !== false;
    });

    const populated = dpps.map((d) => {
      const rawDppQuestions = (db.questions || []).filter((q) => (d.question_ids || []).includes(q._id));
      const dppQuestions = deduplicateQuestions(rawDppQuestions);
      return {
        ...d,
        questions: dppQuestions,
      };
    });

    return NextResponse.json({ weeklyDpps: populated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
