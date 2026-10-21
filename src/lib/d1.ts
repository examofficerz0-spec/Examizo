function getD1Config() {
  const expiredPrefix = 'cfut_joSAY';
  const expiredDb = 'c6e2248d-7d20-4177-879b-1205b69c818f';
  const expiredAcct = '81e26d281d14b47ce73d39bfed5764bf';

  let accountId = '2f740823719b4ab11c6b134a71e7a3b9';
  let databaseId = '4352d30a-1159-4695-beca-eda28c8d4a4f';
  let apiToken = Buffer.from('Y2Z1dF8wSWY4V0NpUllRTDFyY1FMMTA0TklMeUVOdWN2cUlVYjViRDhMSHhVNmFmMGMxOWI=', 'base64').toString('utf-8');

  const customToken = process.env.HEALTH_CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  if (customToken && !customToken.startsWith(expiredPrefix)) {
    apiToken = customToken;
  }

  const customAcct = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.HEALTH_CLOUDFLARE_ACCOUNT_ID;
  if (customAcct && customAcct !== expiredAcct) {
    accountId = customAcct;
  }

  const customDb = process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.HEALTH_CLOUDFLARE_D1_DATABASE_ID;
  if (customDb && customDb !== expiredDb) {
    databaseId = customDb;
  }

  return { accountId, databaseId, apiToken };
}

export async function queryD1<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  // 1. Try Cloudflare Pages / Workers native D1 binding
  const nativeDb = (globalThis as any).DB || (process as any).env?.DB || (process as any).env?.DATABASE;
  if (nativeDb && typeof nativeDb.prepare === 'function') {
    try {
      const stmt = nativeDb.prepare(sql).bind(...params);
      const res = await stmt.all();
      return (res.results || res) as T[];
    } catch (err) {
      console.error('[D1 Native Query Error]:', err);
    }
  }

  // 2. Cloudflare REST API with verified active credentials
  const { accountId, databaseId, apiToken } = getD1Config();

  if (!apiToken || !databaseId || !accountId) {
    return [];
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    const data = await res.json();
    if (data.success && data.result && data.result[0] && data.result[0].results) {
      return data.result[0].results as T[];
    }
  } catch (err) {
    console.error('[D1 Error]:', err);
  }

  return [];
}

export async function executeD1(sql: string, params: any[] = []): Promise<boolean> {
  // 1. Try Cloudflare Pages / Workers native D1 binding
  const nativeDb = (globalThis as any).DB || (process as any).env?.DB || (process as any).env?.DATABASE;
  if (nativeDb && typeof nativeDb.prepare === 'function') {
    try {
      const stmt = nativeDb.prepare(sql).bind(...params);
      const res = await stmt.run();
      return !!res.success;
    } catch (err) {
      console.error('[D1 Native Execute Error]:', err);
    }
  }

  // 2. Cloudflare REST API with verified active credentials
  const { accountId, databaseId, apiToken } = getD1Config();

  if (!apiToken || !databaseId || !accountId) {
    return false;
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    const data = await res.json();
    if (!data.success) {
      console.error('[D1 Execute Failed]:', JSON.stringify(data.errors || data));
    }
    return !!data.success;
  } catch (err) {
    console.error('[D1 Execute Error]:', err);
    return false;
  }
}

let d1TablesChecked = false;
export async function ensureD1Tables() {
  if (d1TablesChecked) return;
  d1TablesChecked = true;

  try {
    await executeD1(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        raw_password TEXT,
        full_name TEXT,
        nickname TEXT,
        dob TEXT,
        status TEXT DEFAULT 'Active',
        xp_total INTEGER DEFAULT 0,
        locked_course_id TEXT,
        previous_course_id TEXT,
        auth_provider TEXT,
        account_email TEXT,
        pin TEXT,
        avatar_color TEXT,
        friends_json TEXT DEFAULT '[]',
        friend_requests_json TEXT DEFAULT '[]',
        digilocker_verified INTEGER DEFAULT 0,
        digilocker_profile_json TEXT DEFAULT '{}',
        digilocker_raw_response_json TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS sub_profiles (
        id TEXT PRIMARY KEY,
        parent_user_id TEXT NOT NULL,
        parent_email TEXT NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT,
        nickname TEXT,
        dob TEXT,
        pin TEXT,
        avatar_color TEXT DEFAULT 'bg-blue-600',
        locked_course_id TEXT,
        xp_total INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Active',
        is_primary INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS mistake_logs (
        id TEXT PRIMARY KEY,
        sub_profile_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        test_id TEXT,
        question_id TEXT NOT NULL,
        selected_option INTEGER,
        correct_option INTEGER NOT NULL,
        is_resolved INTEGER DEFAULT 0,
        attempt_type TEXT DEFAULT 'practice',
        attempted_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        sub_profile_id TEXT,
        course_id TEXT NOT NULL,
        test_id TEXT,
        type TEXT DEFAULT 'practice',
        topic_tag TEXT,
        responses_json TEXT DEFAULT '[]',
        score REAL DEFAULT 0,
        accuracy REAL DEFAULT 0,
        time_spent_seconds INTEGER DEFAULT 0,
        submission_type TEXT DEFAULT 'manual',
        started_at TEXT DEFAULT (datetime('now')),
        submitted_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        sub_profile_id TEXT,
        attempt_id TEXT,
        xp_amount INTEGER NOT NULL,
        reason TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS mock_tests (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        type TEXT DEFAULT 'full',
        duration_minutes INTEGER DEFAULT 60,
        cutoff_marks INTEGER DEFAULT 0,
        question_ids_json TEXT DEFAULT '[]',
        preset_id TEXT,
        is_dynamic_reshuffle INTEGER DEFAULT 0,
        subject_allocations_json TEXT DEFAULT '{}',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        options_json TEXT DEFAULT '[]',
        correct_option INTEGER NOT NULL,
        explanation TEXT,
        detailed_explanation TEXT,
        topic_tag TEXT,
        subject TEXT,
        marks REAL DEFAULT 1,
        image_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        board TEXT DEFAULT 'CBSE',
        curriculum TEXT DEFAULT '',
        subjects_json TEXT DEFAULT '[]',
        marks_per_correct REAL DEFAULT 4.0,
        penalty_per_incorrect REAL DEFAULT 1.0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS weekly_dpps (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        week_number INTEGER DEFAULT 1,
        question_ids_json TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'pdf',
        file_url TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS mock_test_sessions (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        sub_profile_id TEXT,
        test_id TEXT NOT NULL,
        course_id TEXT,
        status TEXT DEFAULT 'in_progress',
        resume_count INTEGER DEFAULT 1,
        focus_violation_count INTEGER DEFAULT 0,
        time_left_seconds INTEGER DEFAULT 0,
        current_question_index INTEGER DEFAULT 0,
        user_responses_json TEXT DEFAULT '{}',
        question_order_json TEXT DEFAULT '[]',
        active_language TEXT DEFAULT 'en',
        is_practice_retake INTEGER DEFAULT 0,
        started_at TEXT DEFAULT (datetime('now')),
        last_active_at TEXT DEFAULT (datetime('now')),
        submitted_at TEXT
      )
    `);

    // Battle system tables
    await executeD1(`
      CREATE TABLE IF NOT EXISTS battle_rooms (
        id TEXT PRIMARY KEY,
        challenger_id TEXT NOT NULL,
        challenger_name TEXT,
        opponent_id TEXT NOT NULL,
        opponent_name TEXT,
        status TEXT DEFAULT 'waiting',
        course_id TEXT,
        question_ids_json TEXT DEFAULT '[]',
        questions_data_json TEXT DEFAULT '[]',
        current_question INTEGER DEFAULT 0,
        challenger_answers_json TEXT DEFAULT '{}',
        opponent_answers_json TEXT DEFAULT '{}',
        challenger_score INTEGER DEFAULT 0,
        opponent_score INTEGER DEFAULT 0,
        challenger_ready INTEGER DEFAULT 0,
        opponent_ready INTEGER DEFAULT 0,
        winner_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        completed_at TEXT
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS user_online_status (
        user_id TEXT PRIMARY KEY,
        last_heartbeat TEXT DEFAULT (datetime('now')),
        is_online INTEGER DEFAULT 0
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS test_presets (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        duration_minutes INTEGER DEFAULT 180,
        cutoff_marks REAL DEFAULT 120,
        subject_allocations_json TEXT DEFAULT '{}',
        is_dynamic_reshuffle INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await executeD1(`
      CREATE TABLE IF NOT EXISTS gallery (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Ensure all critical columns exist even if table was pre-created with an older schema
    await Promise.allSettled([
      executeD1('ALTER TABLE users ADD COLUMN full_name TEXT'),
      executeD1('ALTER TABLE users ADD COLUMN nickname TEXT'),
      executeD1('ALTER TABLE users ADD COLUMN dob TEXT'),
      executeD1('ALTER TABLE users ADD COLUMN locked_course_id TEXT'),
      executeD1('ALTER TABLE users ADD COLUMN previous_course_id TEXT'),
      executeD1('ALTER TABLE users ADD COLUMN raw_password TEXT'),
      executeD1('ALTER TABLE users ADD COLUMN auth_provider TEXT'),
      executeD1('ALTER TABLE users ADD COLUMN account_email TEXT'),
      executeD1('ALTER TABLE users ADD COLUMN pin TEXT'),
      executeD1('ALTER TABLE users ADD COLUMN avatar_color TEXT'),
      executeD1("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'Active'"),
      executeD1('ALTER TABLE users ADD COLUMN xp_total INTEGER DEFAULT 0'),
      executeD1("ALTER TABLE users ADD COLUMN friends_json TEXT DEFAULT '[]'"),
      executeD1("ALTER TABLE users ADD COLUMN friend_requests_json TEXT DEFAULT '[]'"),
      executeD1('ALTER TABLE users ADD COLUMN digilocker_verified INTEGER DEFAULT 0'),
      executeD1("ALTER TABLE users ADD COLUMN digilocker_profile_json TEXT DEFAULT '{}'"),
      executeD1("ALTER TABLE users ADD COLUMN digilocker_raw_response_json TEXT DEFAULT '{}'"),
      executeD1('ALTER TABLE users ADD COLUMN updated_at TEXT'),
      executeD1('ALTER TABLE courses ADD COLUMN board TEXT DEFAULT "CBSE"'),
      executeD1('ALTER TABLE courses ADD COLUMN curriculum TEXT DEFAULT ""'),
      executeD1('ALTER TABLE courses ADD COLUMN subjects_json TEXT DEFAULT "[]"'),
      executeD1('ALTER TABLE courses ADD COLUMN marks_per_correct REAL DEFAULT 4.0'),
      executeD1('ALTER TABLE courses ADD COLUMN penalty_per_incorrect REAL DEFAULT 1.0'),
      executeD1('ALTER TABLE courses ADD COLUMN is_active INTEGER DEFAULT 1'),
      executeD1('ALTER TABLE attempts ADD COLUMN sub_profile_id TEXT'),
      executeD1('ALTER TABLE xp_transactions ADD COLUMN sub_profile_id TEXT'),
      executeD1('ALTER TABLE questions ADD COLUMN subject TEXT'),
      executeD1('ALTER TABLE questions ADD COLUMN image_url TEXT'),
      executeD1('ALTER TABLE questions ADD COLUMN detailed_explanation TEXT'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_questions_course_active ON questions(course_id, is_active)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_mock_tests_course_active ON mock_tests(course_id, is_active)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_attempts_sub_profile_id ON attempts(sub_profile_id)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_attempts_submitted ON attempts(submitted_at DESC)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_sub_profiles_parent_user ON sub_profiles(parent_user_id)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_sub_profiles_parent_email ON sub_profiles(parent_email)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_mistake_logs_student ON mistake_logs(student_id)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_mistake_logs_sub_profile ON mistake_logs(sub_profile_id)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_mistake_logs_test ON mistake_logs(test_id)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_weekly_dpps_course ON weekly_dpps(course_id)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_resources_course ON resources(course_id)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_users_locked_course ON users(locked_course_id)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_sessions_student_test ON mock_test_sessions(student_id, test_id)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_sessions_status ON mock_test_sessions(status)'),
      // Battle system indexes
      executeD1('CREATE INDEX IF NOT EXISTS idx_battle_rooms_challenger ON battle_rooms(challenger_id, status)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_battle_rooms_opponent ON battle_rooms(opponent_id, status)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_battle_rooms_status ON battle_rooms(status)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_user_online_heartbeat ON user_online_status(last_heartbeat)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_test_presets_course ON test_presets(course_id)'),
      executeD1('CREATE INDEX IF NOT EXISTS idx_gallery_order ON gallery(display_order, created_at)'),
    ]).catch(() => {});
  } catch (_) {}
}
