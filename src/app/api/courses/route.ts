import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Course } from '@/lib/models';
import { readSharedDb } from '@/lib/sharedDb';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Try Cloudflare D1
    try {
      const d1Courses = await queryD1('SELECT * FROM courses ORDER BY created_at DESC');
      if (d1Courses && d1Courses.length > 0) {
        const formatted = d1Courses
          .filter((c: any) => c.is_active !== 0 && c.is_active !== false && String(c.is_active) !== 'false')
          .map((c: any) => {
            let subjects = [];
            try {
              subjects = typeof c.subjects_json === 'string' ? JSON.parse(c.subjects_json) : (c.subjects_json || []);
            } catch (e) {
              subjects = ['Physics', 'Chemistry', 'Mathematics'];
            }

            return {
              _id: c.id,
              id: c.id,
              name: c.name,
              description: c.description,
              category: c.category,
              board: c.board,
              curriculum: c.curriculum,
              subjects,
              marking_scheme: {
                marks_per_correct: c.marks_per_correct || 4,
                penalty_per_incorrect: c.penalty_per_incorrect || 1,
              },
              is_active: c.is_active !== 0 && c.is_active !== false && String(c.is_active) !== 'false',
            };
          });

        if (formatted.length > 0) {
          return NextResponse.json({ courses: formatted });
        }
      }
    } catch (e) {
      console.warn('[Student Courses GET D1 Error]:', e);
    }

    // 2. Memory Mode Fallback
    const { isMemoryMode } = await dbConnect();
    if (isMemoryMode) {
      const db = readSharedDb();
      const courses = (db.courses || []).filter((c) => c.is_active !== false && String(c.is_active) !== 'false');
      return NextResponse.json({ courses });
    }

    // 3. Mongoose Fallback
    const courses = await Course.find({ is_active: { $ne: false } }).sort({ created_at: -1 });
    return NextResponse.json({ courses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
