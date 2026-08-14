import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User, Question, Course, Attempt } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getEquivalentCourseIds } from '@/lib/courseMatcher';

export async function GET(req: Request) {
  try {
    const { isMemoryMode } = await dbConnect();
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic');
    const subject = searchParams.get('subject');

    if (isMemoryMode) {
      const db = readSharedDb();
      const user = (db.users || []).find((u) => String(u._id) === String(auth.userId));
      if (!user || !user.locked_course_id) {
        return NextResponse.json({ error: 'No course locked' }, { status: 400 });
      }

      const rawCourseId = user.locked_course_id;
      const courseId = typeof rawCourseId === 'object' && rawCourseId?._id ? String(rawCourseId._id) : String(rawCourseId);
      const courseObj = (db.courses || []).find((c) => String(c._id) === courseId || c.name === courseId) || (typeof rawCourseId === 'object' ? rawCourseId : null);

      const validCourseIds = getEquivalentCourseIds(courseId, db.courses || []);

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

      const isValidSubjectName = (str: string): boolean => {
        if (!str || typeof str !== 'string') return false;
        const cleaned = str.trim();
        if (!cleaned) return false;
        if (/^\d+$/.test(cleaned)) return false;
        if (/^(?:q(?:uestion)?[\s\.\:]*)?\d+$/i.test(cleaned)) return false;
        return true;
      };

      const subjectSet = new Set<string>();
      if (courseObj?.subjects && Array.isArray(courseObj.subjects)) {
        courseObj.subjects.forEach((s: string) => {
          if (isValidSubjectName(s)) subjectSet.add(s.trim());
        });
      }

      const isGkGsName = (name: string) => /^(?:gk\/?gs|gk|gs|general\s*(?:knowledge|studies|awareness))/i.test(name.trim());
      const hasScience = Array.from(subjectSet).some((s) => s.toLowerCase().trim() === 'science');
      const hasGkGs = Array.from(subjectSet).some((s) => isGkGsName(s));
      const gkSubKeywords = ['general knowledge', 'environment', 'general science', 'indian economy', 'world geography', 'indian geography', 'indian history', 'indian polity', 'history', 'geography', 'polity', 'economy', 'ecology', 'static gk'];

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
            // Keep physics/chemistry/biology inside Science for school tracks
          } else if (hasGkGs && gkSubKeywords.some((k) => subLower.includes(k))) {
            // Keep GK/GS sub-domains inside GK/GS
          } else {
            subjectSet.add(subName);
          }
        }
      });
      if (subjectSet.size === 0) {
        subjectSet.add('Physics');
        subjectSet.add('Chemistry');
        subjectSet.add('Mathematics');
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

      const userAttempts = (db.attempts || []).filter((a) => String(a.student_id) === String(user._id));
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

    // Mongoose mode
    const user = await User.findById(auth.userId);
    if (!user || !user.locked_course_id) {
      return NextResponse.json({ error: 'No course locked' }, { status: 400 });
    }

    const rawCourseId = user.locked_course_id;
    const courseId = typeof rawCourseId === 'object' && rawCourseId?._id ? rawCourseId._id.toString() : rawCourseId.toString();

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

    const query: any = { is_active: true };

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

    const allDbQuestions = await Question.find(query);
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

    const isValidSubjectName = (str: string): boolean => {
      if (!str || typeof str !== 'string') return false;
      const cleaned = str.trim();
      if (!cleaned) return false;
      if (/^\d+$/.test(cleaned)) return false;
      if (/^(?:q(?:uestion)?[\s\.\:]*)?\d+$/i.test(cleaned)) return false;
      return true;
    };

    const subjectSet = new Set<string>();
    if (courseObj?.subjects && Array.isArray(courseObj.subjects)) {
      courseObj.subjects.forEach((s: string) => {
        if (isValidSubjectName(s)) subjectSet.add(s.trim());
      });
    }

    const isGkGsName = (name: string) => /^(?:gk\/?gs|gk|gs|general\s*(?:knowledge|studies|awareness))/i.test(name.trim());
    const hasScience = Array.from(subjectSet).some((s) => s.toLowerCase().trim() === 'science');
    const hasGkGs = Array.from(subjectSet).some((s) => isGkGsName(s));
    const gkSubKeywords = ['general knowledge', 'environment', 'general science', 'indian economy', 'world geography', 'indian geography', 'indian history', 'indian polity', 'history', 'geography', 'polity', 'economy', 'ecology', 'static gk'];

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
          // Keep physics/chemistry/biology inside Science for school tracks
        } else if (hasGkGs && gkSubKeywords.some((k) => subLower.includes(k))) {
          // Keep GK/GS sub-domains inside GK/GS
        } else {
          subjectSet.add(subName);
        }
      }
    });
    if (subjectSet.size === 0) {
      subjectSet.add('Physics');
      subjectSet.add('Chemistry');
      subjectSet.add('Mathematics');
    }
    const courseSubjects = Array.from(subjectSet);

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
      questions = questions.filter((q: any) => q.topic_tag === topic || (q.topic_tag || '').toLowerCase().includes(topic.toLowerCase()));
    }

    const topicCounts: Record<string, number> = {};
    questions.forEach((q) => {
      if (q.topic_tag) {
        topicCounts[q.topic_tag] = (topicCounts[q.topic_tag] || 0) + 1;
      }
    });

    const userAttempts = await Attempt.find({ student_id: user._id });
    const completedTopics = Array.from(new Set(userAttempts.map((a) => a.topic_tag).filter(Boolean)));

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
