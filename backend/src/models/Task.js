const db = require('../config/database');

/**
 * Number of days before deadline at which urgency starts rising.
 */
const URGENCY_DAYS_WINDOW = 10;

function computeUrgencyAndPriority(deadline, difficulty, status) {
  if (status === 'completed') return { urgencyScore: 0, priority: 'low' };

  const now = new Date();
  const daysUntil = (new Date(deadline) - now) / (1000 * 60 * 60 * 24);

  let urgencyScore;
  let computedStatus = status;

  if (daysUntil < 0) {
    urgencyScore = 100;
    computedStatus = 'overdue';
  } else {
    urgencyScore = Math.min(100, Math.max(0, URGENCY_DAYS_WINDOW - daysUntil) * (difficulty || 3));
  }

  let priority;
  if (urgencyScore >= 30) priority = 'critical';
  else if (urgencyScore >= 20) priority = 'high';
  else if (urgencyScore >= 10) priority = 'medium';
  else priority = 'low';

  return { urgencyScore, priority, computedStatus };
}

function rowToTask(row) {
  if (!row) return null;
  return {
    _id:               row.id,
    id:                row.id,
    userId:            row.user_id,
    title:             row.title,
    description:       row.description || '',
    type:              row.type,
    course:            row.course || '',
    deadline:          row.deadline,
    difficulty:        row.difficulty,
    estimatedDuration: row.estimated_duration,
    actualDuration:    row.actual_duration,
    status:            row.status,
    priority:          row.priority,
    urgencyScore:      row.urgency_score,
    progress:          row.progress,
    notes:             row.notes || '',
    tags:              (() => { try { return JSON.parse(row.tags || '[]'); } catch { return []; } })(),
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

const Task = {
  find({ userId, status, type, course, priority } = {}) {
    let sql = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [Number(userId)];

    if (status && status !== '$ne:completed') {
      if (typeof status === 'object' && status.$ne) {
        sql += ` AND status != ?`;
        params.push(status.$ne);
      } else {
        sql += ` AND status = ?`;
        params.push(status);
      }
    }
    if (type)     { sql += ` AND type = ?`;     params.push(type); }
    if (course)   { sql += ` AND course = ?`;   params.push(course); }
    if (priority) { sql += ` AND priority = ?`; params.push(priority); }

    sql += ' ORDER BY urgency_score DESC';
    return db.prepare(sql).all(...params).map(rowToTask);
  },

  findById(id, userId) {
    const row = userId !== undefined
      ? db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(Number(id), Number(userId))
      : db.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(id));
    return rowToTask(row);
  },

  create({ userId, title, description, type = 'assignment', course, deadline, difficulty = 3, estimatedDuration = 60, notes, tags = [] }) {
    const { urgencyScore, priority, computedStatus } = computeUrgencyAndPriority(deadline, difficulty, 'pending');
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
    const stmt = db.prepare(`
      INSERT INTO tasks
        (user_id, title, description, type, course, deadline, difficulty, estimated_duration,
         urgency_score, priority, status, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      Number(userId), title.trim(), description || null, type,
      course || null, deadline, Number(difficulty), Number(estimatedDuration),
      urgencyScore, priority, computedStatus, notes || null, tagsJson
    );
    return this.findById(result.lastInsertRowid);
  },

  /** Save an already-retrieved task object back (recomputes urgency) */
  save(task) {
    const { urgencyScore, priority, computedStatus } = computeUrgencyAndPriority(
      task.deadline, task.difficulty, task.status
    );
    const tagsJson = JSON.stringify(Array.isArray(task.tags) ? task.tags : []);
    db.prepare(`
      UPDATE tasks SET
        title = ?, description = ?, type = ?, course = ?, deadline = ?,
        difficulty = ?, estimated_duration = ?, actual_duration = ?,
        status = ?, priority = ?, urgency_score = ?, progress = ?,
        notes = ?, tags = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(
      task.title, task.description || null, task.type, task.course || null, task.deadline,
      Number(task.difficulty), Number(task.estimatedDuration), Number(task.actualDuration || 0),
      computedStatus, priority, urgencyScore, Number(task.progress || 0),
      task.notes || null, tagsJson,
      Number(task._id), Number(task.userId)
    );
    // Return refreshed object
    return this.findById(task._id, task.userId);
  },

  delete(id, userId) {
    const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
      .run(Number(id), Number(userId));
    return result.changes > 0;
  },
};

module.exports = Task;
