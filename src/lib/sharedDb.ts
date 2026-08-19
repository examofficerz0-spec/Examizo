import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

function getDbPath(): string {
  const rootParent = path.join(process.cwd(), '..', 'shared-db.json');
  if (fs.existsSync(rootParent)) return rootParent;

  const currentLocal = path.join(process.cwd(), 'shared-db.json');
  if (fs.existsSync(currentLocal)) return currentLocal;

  return path.join('/tmp', 'shared-db.json');
}

export interface SharedDbData {
  users: any[];
  courses: any[];
  questions: any[];
  mockTests: any[];
  testPresets?: any[];
  weeklyDpps?: any[];
  resources?: any[];
  attempts: any[];
  xpTransactions: any[];
  admins: any[];
  auditLogs: any[];
  notifications?: any[];
}

const initialDb: SharedDbData = {
  users: [],
  courses: [],
  questions: [],
  mockTests: [],
  weeklyDpps: [],
  attempts: [],
  xpTransactions: [],
  admins: [],
  auditLogs: [],
  notifications: [],
};

export function readSharedDb(): SharedDbData {
  const dbPath = getDbPath();
  try {
    if (!fs.existsSync(dbPath)) {
      writeSharedDb(initialDb);
    }
    const raw = fs.readFileSync(dbPath, 'utf-8');
    const data = JSON.parse(raw);

    // Ensure default admin exists
    if (!data.admins || data.admins.length === 0) {
      const hashedAdminPassword = bcrypt.hashSync('Admin@123456', 10);
      data.admins = [
        {
          _id: 'admin_master_1',
          name: 'Master Controller',
          email: 'admin@exammaster.com',
          password_hash: hashedAdminPassword,
          role: 'Super Admin',
          permissions: ['manage_questions', 'manage_courses', 'manage_mock_tests', 'manage_users', 'view_audit_logs'],
          allowed_courses: ['all'],
          created_at: new Date().toISOString(),
        },
      ];
      writeSharedDb(data);
    }

    return data;
  } catch (error) {
    console.error('Error reading shared database:', error);
    return initialDb;
  }
}

export function writeSharedDb(data: SharedDbData): void {
  const dbPath = getDbPath();
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const jsonStr = JSON.stringify(data, null, 2);

    // Write to active dbPath
    fs.writeFileSync(dbPath, jsonStr, 'utf-8');

    // Also sync to all sibling/parent paths to guarantee student-portal and admin-portal are 100% synced
    const targetPaths = [
      path.join(process.cwd(), '..', 'shared-db.json'),
      path.join(process.cwd(), 'shared-db.json'),
      path.join(process.cwd(), '..', 'student-portal', 'shared-db.json'),
      path.join(process.cwd(), '..', 'admin-portal', 'shared-db.json'),
      path.join('/tmp', 'shared-db.json'),
    ];

    for (const p of targetPaths) {
      if (p !== dbPath) {
        try {
          const parentDir = path.dirname(p);
          if (fs.existsSync(parentDir)) {
            fs.writeFileSync(p, jsonStr, 'utf-8');
          }
        } catch (e) {}
      }
    }
  } catch (error) {
    console.error('Error writing to shared database:', error);
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
