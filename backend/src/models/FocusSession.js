const db = require('../config/database');

function rowToSession(row) {
  if (!row) return null;
  return {
    _id:               row.id,
    id:                row.id,
    userId:            row.user_id,
    taskId:            row.task_id || null,
    taskTitle:         row.task_title || null,
    startTime:         row.start_time,
    endTime:           row.end_time || null,
    plannedDuration:   row.planned_duration,
    actualDuration:    row.actual_duration || null,
    completed:         row.completed === 1,
    interrupted:       row.interrupted === 1,
    interruptionCount: row.interruption_count,
    sessionType:       row.session_type,
    notes:             row.notes || null,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

const FocusSession = {
  find({ userId, startTime, endTime, completed } = {}, { limit = 200 } = {}) {
    let sql = 'SELECT * FROM focus_sessions WHERE user_id = ?';
    const params = [Number(userId)];

    if (startTime)            { sql += ' AND start_time >= ?'; params.push(startTime); }
    if (endTime)              { sql += ' AND start_time <= ?'; params.push(endTime); }
    if (completed !== undefined) { sql += ' AND completed = ?'; params.push(completed ? 1 : 0); }

    sql += ' ORDER BY start_time DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }

    return db.prepare(sql).all(...params).map(rowToSession);
  },

  findById(id, userId) {
    const row = userId !== undefined
      ? db.prepare('SELECT * FROM focus_sessions WHERE id = ? AND user_id = ?').get(Number(id), Number(userId))
      : db.prepare('SELECT * FROM focus_sessions WHERE id = ?').get(Number(id));
    return rowToSession(row);
  },

  /** Find the most recent session without an end_time (active session) */
  findActive(userId) {
    const row = db.prepare(`
      SELECT * FROM focus_sessions
      WHERE user_id = ? AND end_time IS NULL
      ORDER BY start_time DESC
      LIMIT 1
    `).get(Number(userId));
    return rowToSession(row);
  },

  create({ userId, taskId, taskTitle, plannedDuration, sessionType = 'study', notes }) {
    const stmt = db.prepare(`
      INSERT INTO focus_sessions
        (user_id, task_id, task_title, start_time, planned_duration, session_type, notes)
      VALUES (?, ?, ?, datetime('now'), ?, ?, ?)
    `);
    const result = stmt.run(
      Number(userId), taskId ? Number(taskId) : null, taskTitle || null,
      Number(plannedDuration), sessionType, notes || null
    );
    return this.findById(result.lastInsertRowid);
  },

  /** End a session — sets end_time, actual_duration, completed, interrupted */
  end(id, userId, { actualDuration, completed = true, interrupted = false, interruptionCount, notes } = {}) {
    const setClauses = [
      `end_time = datetime('now')`,
      'actual_duration = ?',
      'completed = ?',
      'interrupted = ?',
      `updated_at = datetime('now')`,
    ];
    const values = [Number(actualDuration || 0), completed ? 1 : 0, interrupted ? 1 : 0];

    if (interruptionCount !== undefined) {
      setClauses.push('interruption_count = ?');
      values.push(Number(interruptionCount));
    }
    if (notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(notes);
    }
    values.push(Number(id), Number(userId));
    db.prepare(`UPDATE focus_sessions SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...values);
    return this.findById(id, userId);
  },
};

module.exports = FocusSession;
