import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User, Question, Course, Attempt } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { getEquivalentCourseIds } from '@/lib/courseMatcher';
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

    const { user, isMemoryMode } = authResult;
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

    // 1. Try Cloudflare D1 first
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

        const d1Questions = await queryD1('SELECT * FROM questions WHERE course_id = ? AND is_active = 1', [courseRow.id]);
        const d1Attempts = await queryD1('SELECT * FROM attempts WHERE student_id = ? OR student_id = ?', [String(user._id || auth.userId), String(auth.userId)]);

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
          formattedQuestions = formattedQuestions.filter((q) => {
            if (isGk) {
              const tagL = (q.topic_tag || '').toLowerCase();
              const subL = (q.subject || '').toLowerCase();
              return isGkGsName(subL) || isGkGsName(tagL) || gkSubKeywords.some((k) => tagL.includes(k) || subL.includes(k));
            }
            return (
              (q.subject || '').toLowerCase().includes(subject.toLowerCase()) ||
              (q.topic_tag || '').toLowerCase().includes(subject.toLowerCase())
            );
          });
        }

        if (topic) {
          formattedQuestions = formattedQuestions.filter(
            (q) => q.topic_tag === topic || (q.topic_tag || '').toLowerCase().includes(topic.toLowerCase())
          );
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
          courseName: courseRow.name || 'Selected Track',
          courseSubjects,
        });
      }
    } catch (d1Err) {
      console.warn('[api/practice] D1 query fallback to mongo/memory:', d1Err);
    }

    // 2. Memory Mode Fallback
    if (isMemoryMode) {
      const db = readSharedDb();
      const courseObj = (db.courses || []).find((c) => String(c._id) === courseId || c.name === courseId) || (typeof rawCourseId === 'object' ? rawCourseId : null);
      const validCourseIds = getEquivalentCourseIds(courseId, db.courses || []);

      let questions = (db.questions || []).filter((q) => {
        if (q.is_active === false) return false;
        if (isMalformedQuestion(q.question_text, q.options)) return false;
        const qCourseId = String(typeof q.course_id === 'object' ? q.course_id?._id || q.course_id?.name : q.course_id);
        return (
          validCourseIds.includes(qCourseId) ||
          validCourseIds.includes(String(q.course_id)) ||
          qCourseId === courseId ||
          String(q.course_id) === String(courseObj?._id) ||
          String(q.course_id) === String(courseObj?.name)
        );
      });

      const subjectSet = new Set<string>();
      if (courseObj?.subjects && Array.isArray(courseObj.subjects)) {
        courseObj.subjects.forEach((s: string) => {
          if (isValidSubjectName(s)) subjectSet.add(s.trim());
        });
      }

      const hasScience = Array.from(subjectSet).some((s) => s.toLowerCase().trim() === 'science');
      const hasGkGs = Array.from(subjectSet).some((s) => isGkGsName(s));

      questions.forEach((q: any) => {
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
          } else if (hasGkGs && gkSubKeywords.some((k) => subLower.includes(k))) {
          } else {
            subjectSet.add(subName);
          }
        }
      });
      if (subjectSet.size === 0) {
        subjectSet.add('General');
      }
      const courseSubjects = Array.from(subjectSet);

      const allQuestionsInCourse = questions;
      const topicCounts: Record<string, number> = {};

      allQuestionsInCourse.forEach((q) => {
        if (q.topic_tag) {
          topicCounts[q.topic_tag] = (topicCounts[q.topic_tag] || 0) + 1;
        }
      });

      if (subject) {
        const isGk = isGkGsName(subject);
        questions = questions.filter((q) => {
          if (isGk) {
            const tagL = (q.topic_tag || '').toLowerCase();
            const subL = (q.subject || '').toLowerCase();
            return isGkGsName(subL) || isGkGsName(tagL) || gkSubKeywords.some((k) => tagL.includes(k) || subL.includes(k));
          }
          return (
            (q.subject || '').toLowerCase().includes(subject.toLowerCase()) ||
            (q.topic_tag || '').toLowerCase().includes(subject.toLowerCase())
          );
        });
      }

      if (topic) {
        questions = questions.filter((q) => q.topic_tag === topic || (q.topic_tag || '').toLowerCase().includes(topic.toLowerCase()));
      }

      const userAttempts = (db.attempts || []).filter((a) => String(a.student_id) === String(user._id || auth.userId));
      const completedTopics = Array.from(new Set(userAttempts.map((a) => a.topic_tag).filter(Boolean)));

      return NextResponse.json({
        questions,
        topicCounts,
        completedTopics,
        userAttempts,
        courseName: courseObj?.name || 'Selected Track',
        courseSubjects,
      });
    }

    // 3. Mongoose Fallback
    await dbConnect();
    let courseObj: any = null;
    if (typeof rawCourseId === 'object' && rawCourseId?.name) {
      courseObj = rawCourseId;
    } else {
      try {
        courseObj = await Course.findById(courseId);
      } catch (e) {
        courseObj = null;
      }
    }

    const allCourses = await Course.find({});
    const validCourseIds = getEquivalentCourseIds(courseId, allCourses);

    const allDbQuestions = await Question.find({ is_active: true });
    let questions = allDbQuestions.filter((q: any) => {
      if (isMalformedQuestion(q.question_text, q.options)) return false;
      const qCourseId = String(typeof q.course_id === 'object' ? q.course_id?._id || q.course_id?.name : q.course_id);
      return (
        validCourseIds.includes(qCourseId) ||
        validCourseIds.includes(String(q.course_id)) ||
        qCourseId === courseId ||
        String(q.course_id) === String(courseObj?._id) ||
        String(q.course_id) === String(courseObj?.name)
      );
    });

    const subjectSet = new Set<string>();
    if (courseObj?.subjects && Array.isArray(courseObj.subjects)) {
      courseObj.subjects.forEach((s: string) => {
        if (isValidSubjectName(s)) subjectSet.add(s.trim());
      });
    }

    const hasScience = Array.from(subjectSet).some((s) => s.toLowerCase().trim() === 'science');
    const hasGkGs = Array.from(subjectSet).some((s) => isGkGsName(s));

    questions.forEach((q: any) => {
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
        } else if (hasGkGs && gkSubKeywords.some((k) => subLower.includes(k))) {
        } else {
          subjectSet.add(subName);
        }
      }
    });

    if (subjectSet.size === 0) {
      subjectSet.add('General');
    }
    const courseSubjects = Array.from(subjectSet);

    const allQuestionsInCourse = questions;
    const topicCounts: Record<string, number> = {};

    allQuestionsInCourse.forEach((q: any) => {
      if (q.topic_tag) {
        topicCounts[q.topic_tag] = (topicCounts[q.topic_tag] || 0) + 1;
      }
    });

    if (subject) {
      const isGk = isGkGsName(subject);
      questions = questions.filter((q: any) => {
        if (isGk) {
          const tagL = (q.topic_tag || '').toLowerCase();
          const subL = (q.subject || '').toLowerCase();
          return isGkGsName(subL) || isGkGsName(tagL) || gkSubKeywords.some((k) => tagL.includes(k) || subL.includes(k));
        }
        return (
          (q.subject || '').toLowerCase().includes(subject.toLowerCase()) ||
          (q.topic_tag || '').toLowerCase().includes(subject.toLowerCase())
        );
      });
    }

    if (topic) {
      questions = questions.filter(
        (q: any) => q.topic_tag === topic || (q.topic_tag || '').toLowerCase().includes(topic.toLowerCase())
      );
    }

    const userAttempts = await Attempt.find({ student_id: user._id || auth.userId });
    const completedTopics = Array.from(new Set(userAttempts.map((a: any) => a.topic_tag).filter(Boolean)));

    return NextResponse.json({
      questions,
      topicCounts,
      completedTopics,
      userAttempts,
      courseName: courseObj?.name || 'Selected Track',
      courseSubjects,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
