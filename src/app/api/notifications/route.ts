import { NextResponse } from 'next/server';
import { User, Notification } from '@/lib/models';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserFromAuth } from '@/lib/userHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isRelevantForUser = (n: any, userId: string, courseId?: string | null) => {
  const targetType = n.targetType || 'all';
  if (targetType === 'user') {
    return String(n.targetUserId || '') === String(userId);
  }
  if (targetType === 'course' && courseId) {
    return String(n.targetCourseId || '') === String(courseId);
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

    const { user: currentUser, isMemoryMode } = authResult;

    if (isMemoryMode) {
      const db = readSharedDb();
      const currentUserId = String(currentUser._id);
      const userCourseId = currentUser.locked_course_id ? String(currentUser.locked_course_id) : null;
      const userCreatedAtTime = currentUser.created_at ? new Date(currentUser.created_at).getTime() : 0;

      // Filter notifications relevant to currentUser and not cleared by currentUser
      const allNotifs = (db.notifications || []).filter((n: any) => {
        const clearedBy = (n.clearedBy || []).map((id: any) => String(id));
        if (clearedBy.includes(currentUserId)) return false;

        // New account or sub-profile does NOT receive notifications sent BEFORE their creation!
        const notifTime = n.created_at ? new Date(n.created_at).getTime() : 0;
        if (userCreatedAtTime > 0 && notifTime < userCreatedAtTime - 5000) {
          return false;
        }

        return isRelevantForUser(n, currentUserId, userCourseId);
      });

      // Sort newest first
      allNotifs.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      const formatted = allNotifs.map((n: any) => {
        const readBy = (n.readBy || []).map((id: any) => String(id));
        return {
          id: String(n._id),
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
    }

    // Mongoose Mode
    const userIdStr = currentUser._id.toString();
    const userCourseId = currentUser.locked_course_id ? currentUser.locked_course_id.toString() : null;
    const userCreatedAt = currentUser.created_at ? new Date(currentUser.created_at) : null;

    const query: any = {
      clearedBy: { $ne: userIdStr },
      $or: [
        { targetType: 'all' },
        { targetType: 'user', targetUserId: userIdStr },
      ],
    };

    if (userCourseId) {
      query.$or.push({ targetType: 'course', targetCourseId: userCourseId });
    }

    // New account or sub-profile does NOT receive notifications sent BEFORE their creation!
    if (userCreatedAt) {
      query.created_at = { $gte: new Date(userCreatedAt.getTime() - 5000) };
    }

    const notifs = await Notification.find(query).sort({ created_at: -1 }).limit(30).lean();

    const formatted = notifs.map((n: any) => {
      const readBy = (n.readBy || []).map((id: any) => id.toString());
      return {
        id: n._id.toString(),
        title: n.title,
        message: n.message,
        type: n.type || 'announcement',
        isRead: readBy.includes(userIdStr),
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

    const { user: currentUser, isMemoryMode } = authResult;
    const body = await request.json();
    const { notificationId, markAll, clearRead, clearId } = body;

    if (isMemoryMode) {
      const db = readSharedDb();
      if (!db.notifications) db.notifications = [];

      const currentUserId = String(currentUser._id);
      const userCourseId = currentUser.locked_course_id ? String(currentUser.locked_course_id) : null;

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
        const target = db.notifications.find((n: any) => String(n._id) === String(clearId));
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
        const target = db.notifications.find((n: any) => String(n._id) === String(notificationId));
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
    }

    // Mongoose Mode
    const userIdStr = currentUser._id.toString();
    const userCourseId = currentUser.locked_course_id ? currentUser.locked_course_id.toString() : null;

    const userTargetFilter: any = {
      $or: [
        { targetType: 'all' },
        { targetType: 'user', targetUserId: userIdStr },
      ],
    };
    if (userCourseId) {
      userTargetFilter.$or.push({ targetType: 'course', targetCourseId: userCourseId });
    }

    if (clearRead) {
      await Notification.updateMany(
        {
          ...userTargetFilter,
          readBy: userIdStr,
          clearedBy: { $ne: userIdStr },
        },
        { $addToSet: { clearedBy: userIdStr } }
      );
    } else if (clearId) {
      await Notification.updateOne(
        { _id: clearId, ...userTargetFilter },
        { $addToSet: { clearedBy: userIdStr } }
      );
    } else if (markAll) {
      await Notification.updateMany(
        {
          ...userTargetFilter,
          readBy: { $ne: userIdStr },
        },
        { $addToSet: { readBy: userIdStr } }
      );
    } else if (notificationId) {
      await Notification.updateOne(
        { _id: notificationId, ...userTargetFilter },
        { $addToSet: { readBy: userIdStr } }
      );
    }

    return NextResponse.json({ success: true, message: 'Notification action completed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process notification action' }, { status: 500 });
  }
}
