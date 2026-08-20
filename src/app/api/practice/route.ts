import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic');
    const subject = searchParams.get('subject');

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      const res = NextResponse.json({ error: 'User deleted or not found' }, { status: 401 });
      res.cookies.set('student_token', '', { httpOnly: true, maxAge: 0, path: '/' });
      return res;
    }

    const { user } = authResult;
    if (!user.locked_course_id) {
      return NextResponse.json({ error: 'No course locked' }, { status: 400 });
    }

    const rawCourseId = user.locked_course_id;
    const courseId = typeof rawCourseId === 'object' && rawCourseId?._id ? String(rawCourseId._id) : String(rawCourseId);

    const isMalformedQuestion = (qText: any, options?: any[]): boolean => {
      if (!qText || typeof qText !== 'string') return true;
      const cleaned = qText.trim().toLowerCase();
      if (cleaned.length <= 2) return true;
      const headerWords = [
        'chemistry', 'physics', 'mathematics', 'math', 'biology', 'botany', 'zoology',
        'inorganic chemistry', 'organic chemistry', 'physical chemistry', 'thermodynamics',
        'kinematics', 'mechanics', 'optics', 'waves', 'magnetism', 'electrostatics',
        'algebra', 'calculus', 'vectors', 'trigonometry', 'geometry', 'general', 'science'
      ];
      if (headerWords.includes(cleaned)) return true;
      if (/^(?:subject|topic|chapter)\s*[\:\-]/i.test(cleaned)) return true;
      if (options && Array.isArray(options) && options.length > 0) {
        const opt0 = String(options[0] || '').trim().toLowerCase();
        if (opt0 === cleaned && options.slice(1).every((o) => /^option\s+[b-d]$/i.test(String(o).trim()))) {
          return true;
        }
      }
      return false;
    };

    const isValidSubjectName = (str: string): boolean => {
      if (!str || typeof str !== 'string') return false;
      const cleaned = str.trim();
      if (!cleaned) return false;
      if (/^\d+$/.test(cleaned)) return false;
      if (/^(?:q(?:uestion)?[\s\.\:]*)?\d+$/i.test(cleaned)) return false;
      return true;
    };

    const isGkGsName = (name: string) => /^(?:gk\/?gs|gk|gs|general\s*(?:knowledge|studies|awareness))/i.test(name.trim());
    const gkSubKeywords = ['general knowledge', 'environment', 'general science', 'indian economy', 'world geography', 'indian geography', 'indian history', 'indian polity', 'history', 'geography', 'polity', 'economy', 'ecology', 'static gk'];

    // 1. Primary: Cloudflare D1
    try {
      const d1Courses = await queryD1('SELECT * FROM courses WHERE id = ? OR name = ? LIMIT 1', [courseId, courseId]);
      if (d1Courses && d1Courses.length > 0) {
        const courseRow = d1Courses[0];
        let configuredSubjects: string[] = [];
        try {
          configuredSubjects = typeof courseRow.subjects_json === 'string' ? JSON.parse(courseRow.subjects_json) : (courseRow.subjects_json || []);
        } catch (e) {
          configuredSubjects = [];
        }

        const d1Questions = await queryD1('SELECT * FROM questions WHERE course_id = ? AND (is_active IS NULL OR is_active != 0)', [courseRow.id]);
        const d1Attempts = await queryD1('SELECT * FROM attempts WHERE student_id = ? OR student_id = ?', [String(user._id || auth.userId), String(auth.email || '')]);

        let formattedQuestions = d1Questions
          .map((q: any) => {
            let opts: string[] = [];
            try {
              opts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []);
            } catch (e) {
              opts = [];
            }
            return {
              _id: q.id,
              id: q.id,
              course_id: q.course_id,
              subject: q.subject || (q.topic_tag && q.topic_tag.includes('-') ? q.topic_tag.split('-')[0].trim() : 'General'),
              topic_tag: q.topic_tag || 'General',
              question_type: q.question_type || 'MCQ',
              question_text: q.question_text || '',
              image_url: q.image_url || '',
              options: opts,
              correct_option: Number(q.correct_option || 0),
              sample_answer: q.sample_answer || '',
              marks: Number(q.marks || 1),
              explanation: q.explanation || '',
              detailed_explanation: q.detailed_explanation || '',
              is_active: q.is_active !== 0,
            };
          })
          .filter((q: any) => !isMalformedQuestion(q.question_text, q.options));

        // Deduplicate questions by normalized text signature
        const seenSignatures = new Set<string>();
        const uniqueFormattedQuestions: any[] = [];
        for (const q of formattedQuestions) {
          const sig = (q.question_text || '')
            .toLowerCase()
            .replace(/^(?:q(?:uestion)?[\s\.\:\-]*\d*[\s\.\:\-]+|\d+[\s\.\:\-]+)/i, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (sig && !seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            uniqueFormattedQuestions.push(q);
          }
        }
        formattedQuestions = uniqueFormattedQuestions;

        const subjectSet = new Set<string>();
        if (Array.isArray(configuredSubjects)) {
          configuredSubjects.forEach((s) => {
            if (isValidSubjectName(s)) subjectSet.add(s.trim());
          });
        }

        const hasScience = Array.from(subjectSet).some((s) => s.toLowerCase().trim() === 'science');
        const hasGkGs = Array.from(subjectSet).some((s) => isGkGsName(s));

        formattedQuestions.forEach((q: any) => {
          let subName = '';
          if (q.subject && isValidSubjectName(q.subject)) {
            subName = q.subject.trim();
          } else if (q.topic_tag && typeof q.topic_tag === 'string') {
            const parts = q.topic_tag.split('-').map((p: string) => p.trim());
            if (parts.length > 1 && isValidSubjectName(parts[0])) {
              subName = parts[0];
            }
          }
          if (subName) {
            const subLower = subName.toLowerCase();
            if (hasScience && ['physics', 'chemistry', 'biology', 'botany', 'zoology'].includes(subLower)) {
              // Keep within Science
            } else if (hasGkGs && gkSubKeywords.some((k) => subLower.includes(k))) {
              // Keep within GK/GS
            } else {
              subjectSet.add(subName);
            }
          }
        });

        if (subjectSet.size === 0) {
          subjectSet.add('General');
        }
        const courseSubjects = Array.from(subjectSet);

        const allQuestionsInCourse = formattedQuestions;
        const topicCounts: Record<string, number> = {};

        allQuestionsInCourse.forEach((q) => {
          if (q.topic_tag) {
            topicCounts[q.topic_tag] = (topicCounts[q.topic_tag] || 0) + 1;
          }
        });

        if (subject) {
          const isGk = isGkGsName(subject);
          const subLower = subject.trim().toLowerCase();
          formattedQuestions = formattedQuestions.filter((q) => {
            const qSub = (q.subject || '').trim().toLowerCase();
            const tag = (q.topic_tag || '').trim();
            const tagLower = tag.toLowerCase();
            const tagPrefix = tagLower.split(/[\-\—\:\.]/)[0].trim();

            if (qSub === subLower || tagPrefix === subLower || tagLower === subLower) return true;

            if (isGk) {
              return isGkGsName(qSub) || isGkGsName(tagPrefix) || gkSubKeywords.some((k) => tagLower.startsWith(k) || qSub === k);
            }

            return false;
          });
        }

        if (topic) {
          const topLower = topic.trim().toLowerCase();
          formattedQuestions = formattedQuestions.filter((q) => {
            const tag = (q.topic_tag || '').trim().toLowerCase();
            const tagSuffix = tag.includes('-') ? tag.split('-').slice(1).join('-').trim() : (tag.includes('—') ? tag.split('—').slice(1).join('—').trim() : tag);
            return tag === topLower || tagSuffix === topLower;
          });
        }

        const userAttempts = (d1Attempts || []).map((a: any) => {
          let responses: any[] = [];
          try {
            responses = typeof a.responses_json === 'string' ? JSON.parse(a.responses_json) : (a.responses_json || []);
          } catch (e) {
            responses = [];
          }
          return {
            _id: a.id,
            id: a.id,
            student_id: a.student_id,
            course_id: a.course_id,
            test_id: a.test_id,
            type: a.type,
            topic_tag: a.topic_tag,
            responses,
            score: a.score,
            accuracy: a.accuracy,
            time_spent_seconds: a.time_spent_seconds,
            submission_type: a.submission_type,
            started_at: a.started_at,
            submitted_at: a.submitted_at,
          };
        });

        const completedTopics = Array.from(new Set(userAttempts.map((a: any) => a.topic_tag).filter(Boolean)));

        return NextResponse.json({
          questions: formattedQuestions,
          topicCounts,
          completedTopics,
          userAttempts,
          courseName: courseRow?.name || 'Selected Track',
          courseSubjects,
        });
      }
    } catch (d1Err) {
      console.warn('[api/practice] D1 query fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const courseObj = (db.courses || []).find((c) => String(c._id) === courseId || String(c.id) === courseId);
    let questions = (db.questions || []).filter((q) => String(q.course_id) === courseId && q.is_active !== false);

    const seenFallbackSignatures = new Set<string>();
    const uniqueFallbackQuestions: any[] = [];
    for (const q of questions) {
      const sig = (q.question_text || '')
        .toLowerCase()
        .replace(/^(?:q(?:uestion)?[\s\.\:\-]*\d*[\s\.\:\-]+|\d+[\s\.\:\-]+)/i, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (sig && !seenFallbackSignatures.has(sig)) {
        seenFallbackSignatures.add(sig);
        uniqueFallbackQuestions.push(q);
      }
    }
    questions = uniqueFallbackQuestions;

    const topicCounts: Record<string, number> = {};
    questions.forEach((q) => {
      if (q.topic_tag) topicCounts[q.topic_tag] = (topicCounts[q.topic_tag] || 0) + 1;
    });

    const userAttempts = (db.attempts || []).filter((a) => String(a.student_id) === String(user._id || auth.userId));
    const completedTopics = Array.from(new Set(userAttempts.map((a) => a.topic_tag).filter(Boolean)));

    return NextResponse.json({
      questions,
      topicCounts,
      completedTopics,
      userAttempts,
      courseName: courseObj?.name || 'Selected Track',
      courseSubjects: courseObj?.subjects || ['General'],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
