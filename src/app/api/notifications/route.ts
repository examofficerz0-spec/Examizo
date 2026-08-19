import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';
import { queryD1, executeD1 } from '@/lib/d1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isRelevantForUser = (n: any, userId: string, courseId?: string | null) => {
  const targetType = n.targetType || n.target_type || 'all';
  if (targetType === 'user') {
    return String(n.targetUserId || n.target_user_id || '') === String(userId);
  }
  if (targetType === 'course' && courseId) {
    return String(n.targetCourseId || n.target_course_id || '') === String(courseId);
  }
  if (targetType === 'all') {
    return true;
  }
  return false;
};

// GET: Fetch student notifications (Personal + Course + Broadcast 'all')
export async function GET() {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user: currentUser } = authResult;
    const currentUserId = String(currentUser._id || currentUser.id || auth.userId);
    const userCourseId = currentUser.locked_course_id ? String(currentUser.locked_course_id) : null;

    // 1. Primary: Cloudflare D1
    try {
      const d1Notifs = await queryD1('SELECT * FROM notifications ORDER BY created_at DESC');
      if (d1Notifs && Array.isArray(d1Notifs)) {
        const userCreatedAtTime = currentUser.created_at ? new Date(currentUser.created_at).getTime() : 0;

        const filtered = d1Notifs.filter((n: any) => {
          let clearedBy: string[] = [];
          try {
            clearedBy = typeof n.cleared_by_json === 'string' ? JSON.parse(n.cleared_by_json) : (n.clearedBy || []);
          } catch (_) {}
          if (clearedBy.map(String).includes(currentUserId)) return false;

          const notifTime = n.created_at ? new Date(n.created_at).getTime() : 0;
          if (userCreatedAtTime > 0 && notifTime < userCreatedAtTime - 5000) {
            return false;
          }

          return isRelevantForUser(n, currentUserId, userCourseId);
        });

        const formatted = filtered.map((n: any) => {
          let readBy: string[] = [];
          try {
            readBy = typeof n.read_by_json === 'string' ? JSON.parse(n.read_by_json) : (n.readBy || []);
          } catch (_) {}
          return {
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type || 'announcement',
            isRead: readBy.map(String).includes(currentUserId),
            created_at: n.created_at,
          };
        });

        const unreadCount = formatted.filter((n: any) => !n.isRead).length;
        return NextResponse.json({ notifications: formatted, unreadCount });
      }
    } catch (d1Err) {
      console.warn('[notifications GET] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    const userCreatedAtTime = currentUser.created_at ? new Date(currentUser.created_at).getTime() : 0;

    const allNotifs = (db.notifications || []).filter((n: any) => {
      const clearedBy = (n.clearedBy || []).map((id: any) => String(id));
      if (clearedBy.includes(currentUserId)) return false;

      const notifTime = n.created_at ? new Date(n.created_at).getTime() : 0;
      if (userCreatedAtTime > 0 && notifTime < userCreatedAtTime - 5000) {
        return false;
      }

      return isRelevantForUser(n, currentUserId, userCourseId);
    });

    allNotifs.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const formatted = allNotifs.map((n: any) => {
      const readBy = (n.readBy || []).map((id: any) => String(id));
      return {
        id: String(n._id || n.id),
        title: n.title,
        message: n.message,
        type: n.type || 'announcement',
        isRead: readBy.includes(currentUserId),
        created_at: n.created_at,
      };
    });

    const unreadCount = formatted.filter((n: any) => !n.isRead).length;

    return NextResponse.json({
      notifications: formatted,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST: Mark notification(s) as read or clear read notifications for current user
export async function POST(request: Request) {
  try {
    const auth = getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authResult = await getUserFromAuth(auth);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user: currentUser } = authResult;
    const body = await request.json();
    const { notificationId, markAll, clearRead, clearId } = body;

    const currentUserId = String(currentUser._id || currentUser.id || auth.userId);
    const userCourseId = currentUser.locked_course_id ? String(currentUser.locked_course_id) : null;

    // 1. Primary: Cloudflare D1
    try {
      const d1Notifs = await queryD1('SELECT * FROM notifications');
      if (d1Notifs && Array.isArray(d1Notifs)) {
        for (const n of d1Notifs) {
          if (!isRelevantForUser(n, currentUserId, userCourseId)) continue;
          let readBy: string[] = [];
          let clearedBy: string[] = [];
          try {
            readBy = typeof n.read_by_json === 'string' ? JSON.parse(n.read_by_json) : (n.readBy || []);
          } catch (_) {}
          try {
            clearedBy = typeof n.cleared_by_json === 'string' ? JSON.parse(n.cleared_by_json) : (n.clearedBy || []);
          } catch (_) {}

          let changed = false;
          if (clearRead && readBy.includes(currentUserId) && !clearedBy.includes(currentUserId)) {
            clearedBy.push(currentUserId);
            changed = true;
          } else if (clearId && String(n.id) === String(clearId) && !clearedBy.includes(currentUserId)) {
            clearedBy.push(currentUserId);
            changed = true;
          } else if (markAll && !readBy.includes(currentUserId)) {
            readBy.push(currentUserId);
            changed = true;
          } else if (notificationId && String(n.id) === String(notificationId) && !readBy.includes(currentUserId)) {
            readBy.push(currentUserId);
            changed = true;
          }

          if (changed) {
            await executeD1('UPDATE notifications SET read_by_json = ?, cleared_by_json = ? WHERE id = ?', [
              JSON.stringify(readBy),
              JSON.stringify(clearedBy),
              n.id,
            ]);
          }
        }
      }
    } catch (d1Err) {
      console.warn('[notifications POST] D1 fallback:', d1Err);
    }

    // 2. Shared DB Local Resilience Fallback
    const db = readSharedDb();
    if (!db.notifications) db.notifications = [];

    if (clearRead) {
      db.notifications.forEach((n: any) => {
        if (!isRelevantForUser(n, currentUserId, userCourseId)) return;
        if (!n.clearedBy) n.clearedBy = [];
        const readBy = (n.readBy || []).map((id: any) => String(id));
        const clearedBy = n.clearedBy.map((id: any) => String(id));
        if (readBy.includes(currentUserId) && !clearedBy.includes(currentUserId)) {
          n.clearedBy.push(currentUserId);
        }
      });
    } else if (clearId) {
      const target = db.notifications.find((n: any) => String(n._id || n.id) === String(clearId));
      if (target && isRelevantForUser(target, currentUserId, userCourseId)) {
        if (!target.clearedBy) target.clearedBy = [];
        const clearedBy = target.clearedBy.map((id: any) => String(id));
        if (!clearedBy.includes(currentUserId)) {
          target.clearedBy.push(currentUserId);
        }
      }
    } else if (markAll) {
      db.notifications.forEach((n: any) => {
        if (!isRelevantForUser(n, currentUserId, userCourseId)) return;
        if (!n.readBy) n.readBy = [];
        const readBy = n.readBy.map((id: any) => String(id));
        if (!readBy.includes(currentUserId)) {
          n.readBy.push(currentUserId);
        }
      });
    } else if (notificationId) {
      const target = db.notifications.find((n: any) => String(n._id || n.id) === String(notificationId));
      if (target && isRelevantForUser(target, currentUserId, userCourseId)) {
        if (!target.readBy) target.readBy = [];
        const readBy = target.readBy.map((id: any) => String(id));
        if (!readBy.includes(currentUserId)) {
          target.readBy.push(currentUserId);
        }
      }
    }

    writeSharedDb(db);
    return NextResponse.json({ success: true, message: 'Notification action completed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process notification action' }, { status: 500 });
  }
}
