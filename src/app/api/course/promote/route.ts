import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { queryD1, executeD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseGradeNumber(courseName: string): number | null {
  const match = String(courseName || '').match(/class\s*(\d+)/i);
  if (match && match[1]) {
    const grade = parseInt(match[1], 10);
    if (!isNaN(grade) && grade >= 3 && grade <= 12) {
      return grade;
    }
  }
  return null;
}

function isSchoolCourse(course: any): boolean {
  if (!course) return false;
  const category = String(course.category || '').toLowerCase();
  const name = String(course.name || '').toLowerCase();
  const str = `${category} ${name}`;
  return (
    str.includes('school') ||
    str.includes('class') ||
    str.includes('3-12') ||
    str.includes('6-12') ||
    str.includes('board') ||
    str.includes('grade') ||
    parseGradeNumber(course.name) !== null
  );
}

// GET: Check promotion status and available next/previous classes
export async function GET(request: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testMarchParam = searchParams.get('testMarch');

    const currentMonth = new Date().getMonth();
    const isMarchMonth = currentMonth === 2 || testMarchParam === 'true' || process.env.NODE_ENV !== 'production';

    // 1. Primary: Cloudflare D1
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE id = ? OR email = ? LIMIT 1', [String(auth.userId), String(auth.email).toLowerCase()]);
      if (d1Users && d1Users.length > 0) {
        const currentUser = d1Users[0];
        if (!currentUser.locked_course_id) {
          return NextResponse.json({ isSchoolUser: false, reason: 'No locked course' });
        }

        const d1Courses = await queryD1('SELECT * FROM courses');
        const currentCourse = (d1Courses || []).find((c: any) => String(c.id) === String(currentUser.locked_course_id));

        if (!currentCourse || !isSchoolCourse(currentCourse)) {
          return NextResponse.json({ isSchoolUser: false });
        }

        const currentGrade = parseGradeNumber(currentCourse.name);
        const nextGrade = currentGrade && currentGrade < 12 ? currentGrade + 1 : null;

        let nextCourse: any = null;
        if (nextGrade) {
          nextCourse = (d1Courses || []).find((c: any) => {
            if (!isSchoolCourse(c)) return false;
            const g = parseGradeNumber(c.name);
            if (g !== nextGrade) return false;
            if (currentCourse.board && c.board) {
              return String(c.board).toLowerCase() === String(currentCourse.board).toLowerCase();
            }
            return true;
          });
        }

        let previousCourse: any = null;
        if (currentUser.previous_course_id) {
          previousCourse = (d1Courses || []).find((c: any) => String(c.id) === String(currentUser.previous_course_id));
        }

        return NextResponse.json({
          isSchoolUser: true,
          isMarchActive: isMarchMonth,
          realMonthIsMarch: currentMonth === 2,
          currentCourse: {
            _id: currentCourse.id,
            id: currentCourse.id,
            name: currentCourse.name,
            board: currentCourse.board,
            grade: currentGrade,
          },
          nextCourse: nextCourse ? { _id: nextCourse.id, id: nextCourse.id, name: nextCourse.name, grade: nextGrade } : null,
          previousCourse: previousCourse ? { _id: previousCourse.id, id: previousCourse.id, name: previousCourse.name } : null,
          hasPromoted: !!currentUser.previous_course_id,
          canPromote: isMarchMonth && !!nextCourse,
          canRollback: isMarchMonth && !!previousCourse,
        });
      }
    } catch (d1Err) {
      console.warn('[course/promote GET] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const currentUser = (db.users || []).find((u) => u._id === auth.userId || u.id === auth.userId);
    if (!currentUser || !currentUser.locked_course_id) {
      return NextResponse.json({ isSchoolUser: false, reason: 'No locked course' });
    }

    const currentCourse = (db.courses || []).find(
      (c) => String(c._id) === String(currentUser.locked_course_id) || String(c.id) === String(currentUser.locked_course_id)
    );

    if (!currentCourse || !isSchoolCourse(currentCourse)) {
      return NextResponse.json({ isSchoolUser: false });
    }

    const currentGrade = parseGradeNumber(currentCourse.name);
    const nextGrade = currentGrade && currentGrade < 12 ? currentGrade + 1 : null;

    let nextCourse: any = null;
    if (nextGrade) {
      nextCourse = (db.courses || []).find((c) => {
        if (!isSchoolCourse(c)) return false;
        const g = parseGradeNumber(c.name);
        if (g !== nextGrade) return false;
        if (currentCourse.board && c.board) {
          return String(c.board).toLowerCase() === String(currentCourse.board).toLowerCase();
        }
        return true;
      });
    }

    let previousCourse: any = null;
    if (currentUser.previous_course_id) {
      previousCourse = (db.courses || []).find(
        (c) => String(c._id) === String(currentUser.previous_course_id) || String(c.id) === String(currentUser.previous_course_id)
      );
    }

    return NextResponse.json({
      isSchoolUser: true,
      isMarchActive: isMarchMonth,
      realMonthIsMarch: currentMonth === 2,
      currentCourse: {
        _id: currentCourse._id || currentCourse.id,
        id: currentCourse.id || currentCourse._id,
        name: currentCourse.name,
        board: currentCourse.board,
        grade: currentGrade,
      },
      nextCourse: nextCourse ? { _id: nextCourse._id || nextCourse.id, id: nextCourse.id || nextCourse._id, name: nextCourse.name, grade: nextGrade } : null,
      previousCourse: previousCourse ? { _id: previousCourse._id || previousCourse.id, id: previousCourse.id || previousCourse._id, name: previousCourse.name } : null,
      hasPromoted: !!currentUser.previous_course_id,
      canPromote: isMarchMonth && !!nextCourse,
      canRollback: isMarchMonth && !!previousCourse,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Execute Promote or Rollback action
export async function POST(request: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'promote' | 'rollback'

    if (!['promote', 'rollback'].includes(action)) {
      return NextResponse.json({ error: 'Valid action (promote or rollback) is required' }, { status: 400 });
    }

    const currentMonth = new Date().getMonth();
    const isMarchMonth = currentMonth === 2 || process.env.NODE_ENV !== 'production';

    if (!isMarchMonth) {
      return NextResponse.json(
        { error: 'Annual class promotion & rollback is only active during the month of March.' },
        { status: 403 }
      );
    }

    // 1. Primary: Cloudflare D1
    try {
      const d1Users = await queryD1('SELECT * FROM users WHERE id = ? OR email = ? LIMIT 1', [String(auth.userId), String(auth.email).toLowerCase()]);
      if (d1Users && d1Users.length > 0) {
        const currentUser = d1Users[0];
        const d1Courses = await queryD1('SELECT * FROM courses');
        const currentCourse = (d1Courses || []).find((c: any) => String(c.id) === String(currentUser.locked_course_id));

        if (!currentCourse || !isSchoolCourse(currentCourse)) {
          return NextResponse.json(
            { error: 'This feature is only available for School Exams (Class 3 to 12) students.' },
            { status: 400 }
          );
        }

        if (action === 'promote') {
          const currentGrade = parseGradeNumber(currentCourse.name);
          const nextGrade = currentGrade && currentGrade < 12 ? currentGrade + 1 : null;
          if (!nextGrade) {
            return NextResponse.json({ error: 'You are already at the highest available class.' }, { status: 400 });
          }

          const nextCourse = (d1Courses || []).find((c: any) => {
            if (!isSchoolCourse(c)) return false;
            const g = parseGradeNumber(c.name);
            if (g !== nextGrade) return false;
            if (currentCourse.board && c.board) {
              return String(c.board).toLowerCase() === String(currentCourse.board).toLowerCase();
            }
            return true;
          });

          if (!nextCourse) {
            return NextResponse.json({ error: `Next class course (Class ${nextGrade}) not found.` }, { status: 404 });
          }

          await executeD1('UPDATE users SET previous_course_id = ?, locked_course_id = ? WHERE id = ?', [
            currentUser.locked_course_id,
            nextCourse.id,
            currentUser.id,
          ]);

          return NextResponse.json({
            success: true,
            action: 'promote',
            message: `Congratulations! You have successfully promoted to ${nextCourse.name}!`,
            newCourse: { _id: nextCourse.id, id: nextCourse.id, name: nextCourse.name },
          });
        } else {
          // Rollback
          if (!currentUser.previous_course_id) {
            return NextResponse.json({ error: 'No previous class recorded to rollback to.' }, { status: 400 });
          }

          const previousCourse = (d1Courses || []).find((c: any) => String(c.id) === String(currentUser.previous_course_id));
          if (!previousCourse) {
            return NextResponse.json({ error: 'Previous course record not found.' }, { status: 404 });
          }

          await executeD1('UPDATE users SET locked_course_id = ?, previous_course_id = NULL WHERE id = ?', [
            currentUser.previous_course_id,
            currentUser.id,
          ]);

          return NextResponse.json({
            success: true,
            action: 'rollback',
            message: `Rolled back successfully to ${previousCourse.name}!`,
            newCourse: { _id: previousCourse.id, id: previousCourse.id, name: previousCourse.name },
          });
        }
      }
    } catch (d1Err) {
      console.warn('[course/promote POST] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const userIndex = (db.users || []).findIndex((u) => u._id === auth.userId || u.id === auth.userId);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentUser = db.users[userIndex];
    const currentCourse = (db.courses || []).find(
      (c) => String(c._id) === String(currentUser.locked_course_id) || String(c.id) === String(currentUser.locked_course_id)
    );

    if (!currentCourse || !isSchoolCourse(currentCourse)) {
      return NextResponse.json(
        { error: 'This feature is only available for School Exams (Class 3 to 12) students.' },
        { status: 400 }
      );
    }

    if (action === 'promote') {
      const currentGrade = parseGradeNumber(currentCourse.name);
      const nextGrade = currentGrade && currentGrade < 12 ? currentGrade + 1 : null;
      if (!nextGrade) {
        return NextResponse.json({ error: 'You are already at the highest available class.' }, { status: 400 });
      }

      const nextCourse = (db.courses || []).find((c) => {
        if (!isSchoolCourse(c)) return false;
        const g = parseGradeNumber(c.name);
        if (g !== nextGrade) return false;
        if (currentCourse.board && c.board) {
          return String(c.board).toLowerCase() === String(currentCourse.board).toLowerCase();
        }
        return true;
      });

      if (!nextCourse) {
        return NextResponse.json({ error: `Next class course (Class ${nextGrade}) not found.` }, { status: 404 });
      }

      db.users[userIndex].previous_course_id = currentUser.locked_course_id;
      db.users[userIndex].locked_course_id = nextCourse._id || nextCourse.id;
      writeSharedDb(db);

      return NextResponse.json({
        success: true,
        action: 'promote',
        message: `Congratulations! You have successfully promoted to ${nextCourse.name}!`,
        newCourse: { _id: nextCourse._id || nextCourse.id, name: nextCourse.name },
      });
    } else {
      if (!currentUser.previous_course_id) {
        return NextResponse.json({ error: 'No previous class recorded to rollback to.' }, { status: 400 });
      }

      const previousCourse = (db.courses || []).find(
        (c) => String(c._id) === String(currentUser.previous_course_id) || String(c.id) === String(currentUser.previous_course_id)
      );

      if (!previousCourse) {
        return NextResponse.json({ error: 'Previous course record not found.' }, { status: 404 });
      }

      db.users[userIndex].locked_course_id = currentUser.previous_course_id;
      db.users[userIndex].previous_course_id = null;
      writeSharedDb(db);

      return NextResponse.json({
        success: true,
        action: 'rollback',
        message: `Rolled back successfully to ${previousCourse.name}!`,
        newCourse: { _id: previousCourse._id || previousCourse.id, name: previousCourse.name },
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
