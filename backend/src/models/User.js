const bcrypt = require('bcryptjs');
const db = require('../config/database');

/**
 * Converts a SQLite row (snake_case) to the shape the rest of the app expects.
 * We also expose preference fields as top-level properties so controllers/auth
 * can read them directly, matching the previous Mongoose document shape.
 */
function rowToUser(row) {
  if (!row) return null;
  return {
    _id:                  row.id,
    id:                   row.id,
    name:                 row.name,
    email:                row.email,
    password:             row.password,       // only present when explicitly selected
    role:                 row.role,
    cgpaTarget:           row.cgpa_target,
    semester:             row.semester,
    studyHoursPerDay:     row.study_hours_per_day,
    focusDuration:        row.focus_duration,
    breakDuration:        row.break_duration,
    longBreakDuration:    row.long_break_duration,
    longBreakAfter:       row.long_break_after,
    namazBreaksEnabled:   row.namaz_breaks_enabled === 1,
    sleepStart:           row.sleep_start,
    sleepEnd:             row.sleep_end,
    studyStartTime:       row.study_start_time,
    studyEndTime:         row.study_end_time,
    streak:               row.streak,
    lastStudyDate:        row.last_study_date ? new Date(row.last_study_date) : null,
    totalStudyMinutes:    row.total_study_minutes,
    createdAt:            row.created_at,
    updatedAt:            row.updated_at,
    // Mongoose compat helpers
    toObject() { return this; },
    matchPassword(plain) { return bcrypt.compare(plain, this.password); },
  };
}

const User = {
  /** Find a user by id (password excluded by default) */
  findById(id, { includePassword = false } = {}) {
    const cols = includePassword ? '*' : 'id,name,email,role,cgpa_target,semester,study_hours_per_day,focus_duration,break_duration,long_break_duration,long_break_after,namaz_breaks_enabled,sleep_start,sleep_end,study_start_time,study_end_time,streak,last_study_date,total_study_minutes,created_at,updated_at';
    const row = db.prepare(`SELECT ${cols} FROM users WHERE id = ?`).get(Number(id));
    return rowToUser(row);
  },

  /** Find a user by arbitrary where object */
  findOne({ email, id } = {}, { includePassword = false } = {}) {
    const cols = includePassword ? '*' : 'id,name,email,role,cgpa_target,semester,study_hours_per_day,focus_duration,break_duration,long_break_duration,long_break_after,namaz_breaks_enabled,sleep_start,sleep_end,study_start_time,study_end_time,streak,last_study_date,total_study_minutes,created_at,updated_at';
    let row;
    if (email !== undefined) {
      row = db.prepare(`SELECT ${cols} FROM users WHERE email = ?`).get(String(email).toLowerCase());
    } else if (id !== undefined) {
      row = db.prepare(`SELECT ${cols} FROM users WHERE id = ?`).get(Number(id));
    }
    return rowToUser(row) || null;
  },

  /** Create a new user (hashes password synchronously before insert) */
  async create({ name, email, password, role = 'student' }) {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(name.trim(), String(email).toLowerCase().trim(), hashed, role);
    return this.findById(result.lastInsertRowid);
  },

  /** Update user fields by id, return updated user */
  update(id, fields) {
    const colMap = {
      name:               'name',
      cgpaTarget:         'cgpa_target',
      semester:           'semester',
      studyHoursPerDay:   'study_hours_per_day',
      focusDuration:      'focus_duration',
      breakDuration:      'break_duration',
      longBreakDuration:  'long_break_duration',
      longBreakAfter:     'long_break_after',
      namazBreaksEnabled: 'namaz_breaks_enabled',
      sleepStart:         'sleep_start',
      sleepEnd:           'sleep_end',
      studyStartTime:     'study_start_time',
      studyEndTime:       'study_end_time',
      streak:             'streak',
      lastStudyDate:      'last_study_date',
      totalStudyMinutes:  'total_study_minutes',
      password:           'password',
    };

    const setClauses = [];
    const values = [];

    for (const [key, val] of Object.entries(fields)) {
      const col = colMap[key];
      if (!col) continue;
      setClauses.push(`${col} = ?`);
      // Store booleans as 0/1
      values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
    }

    if (setClauses.length === 0) return this.findById(id);

    setClauses.push(`updated_at = datetime('now')`);
    values.push(Number(id));
    db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },
};

module.exports = User;
