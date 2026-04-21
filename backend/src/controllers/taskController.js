const Task = require('../models/Task');

const VALID_STATUSES   = ['pending', 'in_progress', 'completed', 'overdue'];
const VALID_TYPES      = ['assignment', 'quiz', 'midterm', 'final', 'project', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

// GET /api/v1/tasks
exports.getTasks = (req, res, next) => {
  try {
    const { status, type, course, priority } = req.query;
    const filter = { userId: req.user.id };
    if (status && VALID_STATUSES.includes(status))     filter.status   = status;
    if (type   && VALID_TYPES.includes(type))          filter.type     = type;
    if (course)                                        filter.course   = String(course).slice(0, 20);
    if (priority && VALID_PRIORITIES.includes(priority)) filter.priority = priority;

    const tasks = Task.find(filter);
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/tasks/stats
exports.getTaskStats = (req, res, next) => {
  try {
    const tasks = Task.find({ userId: req.user.id });
    const total     = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending   = tasks.filter((t) => t.status === 'pending').length;
    const overdue   = tasks.filter((t) => t.status === 'overdue').length;
    const byType    = tasks.reduce((acc, t) => { acc[t.type] = (acc[t.type] || 0) + 1; return acc; }, {});
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    res.status(200).json({ success: true, data: { total, completed, pending, overdue, byType, completionRate } });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/tasks/:id
exports.getTask = (req, res, next) => {
  try {
    const task = Task.findById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/tasks
exports.createTask = (req, res, next) => {
  try {
    const { title, description, type, course, deadline, difficulty, estimatedDuration, notes, tags } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Task title is required' });
    if (!deadline) return res.status(400).json({ success: false, message: 'Deadline is required' });

    const task = Task.create({
      userId: req.user.id, title, description, type, course,
      deadline, difficulty, estimatedDuration, notes, tags,
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/tasks/:id
exports.updateTask = (req, res, next) => {
  try {
    let task = Task.findById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const allowed = ['title', 'description', 'type', 'course', 'deadline', 'difficulty',
                     'estimatedDuration', 'actualDuration', 'status', 'progress', 'notes', 'tags'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) task[f] = req.body[f]; });

    task = Task.save(task);
    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/tasks/:id
exports.deleteTask = (req, res, next) => {
  try {
    const deleted = Task.delete(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Task not found' });
    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/tasks/:id/progress
exports.updateProgress = (req, res, next) => {
  try {
    let task = Task.findById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const progress = Number(req.body.progress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({ success: false, message: 'Progress must be 0–100' });
    }
    task.progress = progress;
    if (progress === 100) task.status = 'completed';
    task = Task.save(task);
    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};
