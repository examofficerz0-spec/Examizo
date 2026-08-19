import { NextResponse } from 'next/server';
import { readSharedDb, writeSharedDb } from '@/lib/sharedDb';
import { queryD1, executeD1 } from '@/lib/d1';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 1. Try D1 first
    try {
      const d1Users = await queryD1('SELECT id, email FROM users WHERE LOWER(email) = ? LIMIT 1', [lowerEmail]);
      if (d1Users && d1Users.length > 0) {
        await executeD1('UPDATE users SET password_hash = ? WHERE LOWER(email) = ?', [hashedPassword, lowerEmail]);

        // Mirror to sharedDb if available
        try {
          const db = readSharedDb();
          if (db.users) {
            const user = db.users.find((u: any) => u.email?.toLowerCase().trim() === lowerEmail);
            if (user) {
              user.password_hash = hashedPassword;
              writeSharedDb(db);
            }
          }
        } catch (_) {}

        return NextResponse.json({ success: true, message: 'Password updated successfully! You can now log in.' });
      }
    } catch (d1Err) {
      console.warn('[auth/reset-password] D1 fallback:', d1Err);
    }

    // 2. Memory Mode Fallback
    const db = readSharedDb();
    if (!db.users) db.users = [];

    const user = db.users.find((u: any) => u.email?.toLowerCase().trim() === lowerEmail);

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email address' }, { status: 404 });
    }

    user.password_hash = hashedPassword;
    writeSharedDb(db);

    return NextResponse.json({ success: true, message: 'Password updated successfully! You can now log in.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
