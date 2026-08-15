import { NextResponse } from 'next/server';
import { readSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authUser = getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const paramCourseId = searchParams.get('course_id');

    let courseId = paramCourseId || authUser?.lockedCourseId || null;

    // Resolve user details to ensure accurate locked course
    if (authUser) {
      const userLookup = await getUserFromAuth(authUser);
      if (userLookup?.user?.locked_course_id) {
        courseId = String(userLookup.user.locked_course_id);
      }
    }

    // 1. Try Cloudflare D1 First (Fastest < 50ms)
    try {
      let d1Courses = await queryD1('SELECT id, name, category, board, curriculum FROM courses');
      let matchedCourse = null;

      if (d1Courses && d1Courses.length > 0) {
        if (!courseId) {
          courseId = d1Courses[0].id;
        }
        matchedCourse = d1Courses.find((c: any) => String(c.id) === String(courseId)) || d1Courses[0];
      }

      let d1Resources = await queryD1(
        'SELECT * FROM resources WHERE is_active = 1 ORDER BY created_at DESC'
      );

      if (d1Resources) {
        if (courseId) {
          d1Resources = d1Resources.filter((r: any) => !r.course_id || String(r.course_id) === String(courseId));
        }

        const formattedResources = d1Resources.map((r: any) => ({
          _id: r.id,
          id: r.id,
          course_id: r.course_id,
          title: r.title,
          description: r.description || '',
          subject: r.subject || 'General',
          resource_type: r.resource_type || 'PDF Book',
          file_url: r.file_url,
          file_size: r.file_size || '2.5 MB',
          page_count: Number(r.page_count || 100),
          created_at: r.created_at,
        }));

        return NextResponse.json({
          success: true,
          course: matchedCourse ? { _id: matchedCourse.id, id: matchedCourse.id, name: matchedCourse.name } : null,
          resources: formattedResources,
        });
      }
    } catch (d1Err) {
      console.warn('[api/resources] D1 error, falling back:', d1Err);
    }

    // 2. Memory Mode Fallback
    const dbData = readSharedDb();
    const courses = dbData.courses || [];
    const resources = dbData.resources || [];

    if (!courseId && courses.length > 0) {
      courseId = courses[0]._id || courses[0].id;
    }

    const matchedCourse = courses.find((c: any) => String(c._id || c.id) === String(courseId)) || courses[0] || null;
    const courseResources = resources.filter(
      (r: any) => !courseId || !r.course_id || String(r.course_id) === String(courseId)
    );

    return NextResponse.json({
      success: true,
      course: matchedCourse,
      resources: courseResources,
    });
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    return NextResponse.json({ error: 'Failed to load resources' }, { status: 500 });
  }
}
