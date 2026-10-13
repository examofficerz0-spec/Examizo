-- ====================================================================
-- Cloudflare D1 SQL Database Schema
-- Database ID: 4352d30a-1159-4695-beca-eda28c8d4a4f (examizo_portal)
-- Application: ExamMaster / Examizo Learning & Assessment Portal
-- ====================================================================

-- 1. Users (Students & Sub-profiles)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  raw_password TEXT,
  locked_course_id TEXT DEFAULT NULL,
  previous_course_id TEXT DEFAULT NULL,
  auth_provider TEXT,
  account_email TEXT,
  pin TEXT,
  avatar_color TEXT,
  status TEXT CHECK(status IN ('Active', 'Suspended', 'Deleted')) DEFAULT 'Active',
  xp_total INTEGER DEFAULT 0,
  friends_json TEXT DEFAULT '[]',
  friend_requests_json TEXT DEFAULT '[]',
  digilocker_verified INTEGER DEFAULT 0,
  digilocker_profile_json TEXT DEFAULT '{}',
  digilocker_raw_response_json TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Safe migration ALTER statements (for existing databases)
-- Cloudflare D1 / SQLite migration additions:
-- ALTER TABLE users ADD COLUMN raw_password TEXT;
-- ALTER TABLE users ADD COLUMN locked_course_id TEXT;
-- ALTER TABLE users ADD COLUMN previous_course_id TEXT;
-- ALTER TABLE users ADD COLUMN auth_provider TEXT;
-- ALTER TABLE users ADD COLUMN account_email TEXT;
-- ALTER TABLE users ADD COLUMN pin TEXT;
-- ALTER TABLE users ADD COLUMN avatar_color TEXT;
-- ALTER TABLE users ADD COLUMN digilocker_verified INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN digilocker_profile_json TEXT DEFAULT '{}';
-- ALTER TABLE users ADD COLUMN digilocker_raw_response_json TEXT DEFAULT '{}';
-- ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 2. Courses
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT CHECK(category IN ('Competitive Exams', 'School Exams')) DEFAULT 'Competitive Exams',
  board TEXT DEFAULT 'CBSE',
  curriculum TEXT DEFAULT '',
  subjects_json TEXT DEFAULT '[]',
  marks_per_correct REAL DEFAULT 4.0,
  penalty_per_incorrect REAL DEFAULT 1.0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Questions
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  topic_tag TEXT NOT NULL,
  question_type TEXT CHECK(question_type IN ('MCQ', 'Short Answer', 'Long Answer')) DEFAULT 'MCQ',
  question_text TEXT NOT NULL,
  options_json TEXT DEFAULT '[]',
  correct_option INTEGER DEFAULT 0,
  sample_answer TEXT DEFAULT '',
  marks REAL DEFAULT 1.0,
  explanation TEXT DEFAULT '',
  detailed_explanation TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 4. Mock Tests
CREATE TABLE IF NOT EXISTS mock_tests (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT CHECK(type IN ('full', 'sectional')) DEFAULT 'full',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  cutoff_marks REAL NOT NULL DEFAULT 0,
  question_ids_json TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 5. Weekly DPPs (Daily Practice Papers)
CREATE TABLE IF NOT EXISTS weekly_dpps (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  question_ids_json TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 6. Study Resources
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject TEXT DEFAULT 'General',
  resource_type TEXT CHECK(resource_type IN ('PDF Book', 'Study Notes', 'Formula Sheet', 'Reference Manual')) DEFAULT 'PDF Book',
  file_url TEXT NOT NULL,
  file_size TEXT DEFAULT '2.5 MB',
  page_count INTEGER DEFAULT 120,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 7. Exam & Practice Attempts
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  test_id TEXT DEFAULT NULL,
  type TEXT CHECK(type IN ('practice', 'mock', 'weekly')) NOT NULL,
  topic_tag TEXT DEFAULT '',
  responses_json TEXT DEFAULT '[]',
  score REAL DEFAULT 0,
  accuracy REAL DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  submission_type TEXT CHECK(submission_type IN ('manual', 'auto')) DEFAULT 'manual',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 8. XP Transactions
CREATE TABLE IF NOT EXISTS xp_transactions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  attempt_id TEXT DEFAULT NULL,
  xp_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Admins
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'Super Admin',
  permissions_json TEXT DEFAULT '["all"]',
  allowed_courses_json TEXT DEFAULT '["all"]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT DEFAULT NULL,
  admin_name TEXT DEFAULT 'System Admin',
  action_type TEXT DEFAULT 'ADMIN_ACTION',
  affected_entity_id TEXT DEFAULT '',
  details TEXT DEFAULT '',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Broadcast Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  target_type TEXT CHECK(target_type IN ('all', 'user', 'course')) DEFAULT 'all',
  target_user_id TEXT DEFAULT NULL,
  target_course_id TEXT DEFAULT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK(type IN ('info', 'alert', 'announcement', 'warning', 'success')) DEFAULT 'announcement',
  read_by_json TEXT DEFAULT '[]',
  cleared_by_json TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast queries & edge performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_locked_course ON users(locked_course_id);
CREATE INDEX IF NOT EXISTS idx_questions_course_id ON questions(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_tag);
CREATE INDEX IF NOT EXISTS idx_mock_tests_course ON mock_tests(course_id);
CREATE INDEX IF NOT EXISTS idx_weekly_dpps_course ON weekly_dpps(course_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_course ON attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
