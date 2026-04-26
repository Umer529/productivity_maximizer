const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/focusflow.db');

// Ensure data directory exists
const fs = require('fs');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema migrations ──────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL,
    email                 TEXT    NOT NULL UNIQUE,
    password              TEXT    NOT NULL,
    role                  TEXT    NOT NULL DEFAULT 'student',
    cgpa_target           REAL    NOT NULL DEFAULT 3.5,
    semester              INTEGER NOT NULL DEFAULT 1,
    study_hours_per_day   REAL    NOT NULL DEFAULT 6,
    focus_duration        INTEGER NOT NULL DEFAULT 25,
    break_duration        INTEGER NOT NULL DEFAULT 5,
    long_break_duration   INTEGER NOT NULL DEFAULT 15,
    long_break_after      INTEGER NOT NULL DEFAULT 4,
    namaz_breaks_enabled  INTEGER NOT NULL DEFAULT 1,
    sleep_start           TEXT    NOT NULL DEFAULT '23:00',
    sleep_end             TEXT    NOT NULL DEFAULT '07:00',
    study_start_time      TEXT    NOT NULL DEFAULT '08:00',
    study_end_time        TEXT    NOT NULL DEFAULT '22:00',
    streak                INTEGER NOT NULL DEFAULT 0,
    last_study_date       TEXT,
    total_study_minutes   INTEGER NOT NULL DEFAULT 0,
    -- ML Feature Fields (19 features for productivity prediction)
    age                   INTEGER NOT NULL DEFAULT 20,
    gender                TEXT    NOT NULL DEFAULT 'Male',
    social_media_hours    REAL    NOT NULL DEFAULT 2,
    netflix_hours         REAL    NOT NULL DEFAULT 1,
    has_part_time_job     INTEGER NOT NULL DEFAULT 0,
    attendance_percentage REAL    NOT NULL DEFAULT 95,
    sleep_hours           REAL    NOT NULL DEFAULT 7,
    diet_quality          TEXT    NOT NULL DEFAULT 'Fair',
    exercise_frequency    INTEGER NOT NULL DEFAULT 3,
    parental_education_level TEXT NOT NULL DEFAULT 'Bachelor',
    internet_quality      TEXT    NOT NULL DEFAULT 'Good',
    mental_health_rating  INTEGER NOT NULL DEFAULT 7,
    extra_curricular_participation INTEGER NOT NULL DEFAULT 0,
    productivity_index    REAL    NOT NULL DEFAULT 50,
    stress_factor         REAL    NOT NULL DEFAULT 30,
    engagement_score      REAL    NOT NULL DEFAULT 50,
    time_efficiency       REAL    NOT NULL DEFAULT 70,
    life_balance_score    REAL    NOT NULL DEFAULT 60,
    created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT    NOT NULL,
    description         TEXT,
    type                TEXT    NOT NULL DEFAULT 'assignment'
                          CHECK(type IN ('assignment','quiz','midterm','final','project','other')),
    course              TEXT,
    deadline            TEXT    NOT NULL,
    difficulty          INTEGER NOT NULL DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),
    estimated_duration  INTEGER NOT NULL DEFAULT 60,
    actual_duration     INTEGER NOT NULL DEFAULT 0,
    status              TEXT    NOT NULL DEFAULT 'pending'
                          CHECK(status IN ('pending','in_progress','completed','overdue')),
    priority            TEXT    NOT NULL DEFAULT 'medium'
                          CHECK(priority IN ('low','medium','high','critical')),
    urgency_score       REAL    NOT NULL DEFAULT 0,
    progress            INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
    notes               TEXT,
    tags                TEXT    NOT NULL DEFAULT '[]',
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS courses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    code         TEXT    NOT NULL,
    color        TEXT    NOT NULL DEFAULT '#6366f1',
    instructor   TEXT,
    credit_hours INTEGER NOT NULL DEFAULT 3,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, code)
  );

  CREATE TABLE IF NOT EXISTS focus_sessions (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id            INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    task_title         TEXT,
    start_time         TEXT    NOT NULL,
    end_time           TEXT,
    planned_duration   INTEGER NOT NULL,
    actual_duration    INTEGER,
    completed          INTEGER NOT NULL DEFAULT 0,
    interrupted        INTEGER NOT NULL DEFAULT 0,
    interruption_count INTEGER NOT NULL DEFAULT 0,
    session_type       TEXT    NOT NULL DEFAULT 'study'
                         CHECK(session_type IN ('study','revision','break','prayer')),
    notes              TEXT,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// Safe column migrations
try {
  db.exec(`ALTER TABLE users ADD COLUMN selected_namaz_prayers TEXT NOT NULL DEFAULT '[]'`);
} catch { /* already exists */ }

try {
  db.exec(`ALTER TABLE users ADD COLUMN custom_breaks TEXT NOT NULL DEFAULT '[]'`);
} catch { /* already exists */ }

console.log(`SQLite database ready at: ${DB_PATH}`);

module.exports = db;
