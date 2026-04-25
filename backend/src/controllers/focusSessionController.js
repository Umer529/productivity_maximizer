const FocusSession = require('../models/FocusSession');
const Task         = require('../models/Task');
const User         = require('../models/User');

// POST /api/v1/focus-sessions/start
exports.startSession = (req, res, next) => {
  try {
    const { taskId, plannedDuration, sessionType, notes } = req.body;
    if (!plannedDuration) {
      return res.status(400).json({ success: false, message: 'plannedDuration is required' });
    }

    let taskTitle;
    if (taskId) {
      const tid = parseInt(taskId, 10);
      if (isNaN(tid)) return res.status(400).json({ success: false, message: 'Invalid taskId' });
      let task = Task.findById(tid, req.user.id);
      if (task) {
        taskTitle = task.title;
        if (task.status === 'pending') {
          task.status = 'in_progress';
          Task.save(task);
        }
      }
    }

    const session = FocusSession.create({
      userId: req.user.id,
      taskId: taskId ? parseInt(taskId, 10) : null,
      taskTitle,
      plannedDuration,
      sessionType: sessionType || 'study',
      notes,
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/focus-sessions/:id/end
exports.endSession = (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) return res.status(404).json({ success: false, message: 'Session not found' });

    const existing = FocusSession.findById(sessionId, req.user.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Session not found' });
    if (existing.endTime) return res.status(400).json({ success: false, message: 'Session already ended' });

    const now = new Date();
    const serverDuration = Math.max(1, Math.round((now - new Date(existing.startTime)) / (1000 * 60)));

    // Prefer client-provided duration (excludes pauses), validate against server wall-clock time
    const clientDuration = req.body.actualDuration ? Number(req.body.actualDuration) : null;
    const actualDuration = (clientDuration && clientDuration > 0 && clientDuration <= serverDuration + 5)
      ? clientDuration
      : serverDuration;

    const session = FocusSession.end(sessionId, req.user.id, {
      actualDuration,
      completed:         req.body.completed !== false,
      interrupted:       req.body.interrupted || false,
      interruptionCount: req.body.interruptionCount,
      notes:             req.body.notes,
    });

    // Update user streak and total study minutes
    const user = User.findById(req.user.id);
    const today     = new Date().toDateString();
    const lastStudy = user.lastStudyDate ? new Date(user.lastStudyDate).toDateString() : null;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const streakUpdate = {};
    if (lastStudy !== today) {
      streakUpdate.streak = (lastStudy === yesterday.toDateString()) ? user.streak + 1 : 1;
      streakUpdate.lastStudyDate = new Date().toISOString();
    }

    // Calculate productivity metrics
    const completionRate = session.completed ? 1.0 : 0.5;
    const efficiency = actualDuration > 0 ? (session.plannedDuration / actualDuration) * 100 : 50;
    const avgEfficiency = (user.timeEfficiency || 70 * 0.9) + (efficiency * 0.1);
    const newProductivityIndex = Math.min(100, (user.productivityIndex || 50) + (completionRate * 5));

    User.update(req.user.id, {
      totalStudyMinutes: user.totalStudyMinutes + actualDuration,
      ...streakUpdate,
      productivityIndex: newProductivityIndex,
      timeEfficiency: avgEfficiency,
    });

    // Update task: accumulate actual time and recalculate progress
    if (session.taskId) {
      let task = Task.findById(session.taskId, req.user.id);
      if (task) {
        task.actualDuration = (task.actualDuration || 0) + actualDuration;

        // Primary: auto-calculate progress from time spent vs estimated
        const timeBasedProgress = task.estimatedDuration > 0
          ? Math.min(100, Math.round((task.actualDuration / task.estimatedDuration) * 100))
          : 0;

        // Allow manual override (completion modal) to set higher progress
        if (req.body.taskProgress !== undefined) {
          task.progress = Math.min(100, Math.max(timeBasedProgress, Number(req.body.taskProgress)));
        } else {
          task.progress = Math.max(task.progress || 0, timeBasedProgress);
        }

        if (task.progress >= 100) task.status = 'completed';
        else if (task.status === 'pending') task.status = 'in_progress';
        Task.save(task);
      }
    }

    res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/focus-sessions/active
exports.getActiveSession = (req, res, next) => {
  try {
    const session = FocusSession.findActive(req.user.id);
    res.status(200).json({ success: true, data: session || null });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/focus-sessions
exports.getSessions = (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const sessions = FocusSession.find({
      userId:    req.user.id,
      startTime: startDate || undefined,
      endTime:   endDate   || undefined,
    }, { limit });
    res.status(200).json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    next(err);
  }
};
