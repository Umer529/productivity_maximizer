const db = require('../config/database');

function rowToCourse(row) {
  if (!row) return null;
  return {
    _id:         row.id,
    id:          row.id,
    userId:      row.user_id,
    name:        row.name,
    code:        row.code,
    color:       row.color,
    instructor:  row.instructor || '',
    creditHours: row.credit_hours,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

const Course = {
  find({ userId } = {}) {
    return db.prepare('SELECT * FROM courses WHERE user_id = ? ORDER BY code ASC')
      .all(Number(userId))
      .map(rowToCourse);
  },

  findById(id, userId) {
    const row = userId !== undefined
      ? db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(Number(id), Number(userId))
      : db.prepare('SELECT * FROM courses WHERE id = ?').get(Number(id));
    return rowToCourse(row);
  },

  create({ userId, name, code, color = '#6366f1', instructor, creditHours = 3 }) {
    const stmt = db.prepare(`
      INSERT INTO courses (user_id, name, code, color, instructor, credit_hours)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    try {
      const result = stmt.run(Number(userId), name.trim(), String(code).toUpperCase().trim(), color, instructor || null, Number(creditHours));
      return this.findById(result.lastInsertRowid);
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const dup = new Error('code already exists');
        dup.code = 'SQLITE_CONSTRAINT_UNIQUE';
        throw dup;
      }
      throw err;
    }
  },

  update(id, userId, { name, code, color, instructor, creditHours }) {
    const setClauses = [];
    const values = [];
    if (name !== undefined)        { setClauses.push('name = ?');         values.push(name.trim()); }
    if (code !== undefined)        { setClauses.push('code = ?');         values.push(String(code).toUpperCase().trim()); }
    if (color !== undefined)       { setClauses.push('color = ?');        values.push(color); }
    if (instructor !== undefined)  { setClauses.push('instructor = ?');   values.push(instructor); }
    if (creditHours !== undefined) { setClauses.push('credit_hours = ?'); values.push(Number(creditHours)); }
    if (setClauses.length === 0) return this.findById(id, userId);
    setClauses.push(`updated_at = datetime('now')`);
    values.push(Number(id), Number(userId));
    db.prepare(`UPDATE courses SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    return this.findById(id, userId);
  },

  delete(id, userId) {
    const result = db.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?')
      .run(Number(id), Number(userId));
    return result.changes > 0;
  },
};

module.exports = Course;
