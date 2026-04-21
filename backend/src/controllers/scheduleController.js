const Task        = require('../models/Task');
const aiScheduler = require('../services/aiSchedulerService');

// GET /api/v1/schedule?date=YYYY-MM-DD
exports.getSchedule = (req, res, next) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const tasks = Task.find({ userId: req.user.id }).filter((t) => t.status !== 'completed');
    const slots = aiScheduler.generateStudySchedule(req.user, tasks, date);
    res.status(200).json({ success: true, data: { date: dateStr, slots } });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/schedule/weekly
exports.getWeeklySchedule = (req, res, next) => {
  try {
    const tasks = Task.find({ userId: req.user.id }).filter((t) => t.status !== 'completed');
    const week  = aiScheduler.generateWeeklySchedule(req.user, tasks);
    res.status(200).json({ success: true, data: week });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/schedule/regenerate
exports.regenerateSchedule = (req, res, next) => {
  try {
    const dateStr = req.body.date || new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const tasks = Task.find({ userId: req.user.id }).filter((t) => t.status !== 'completed');
    const slots = aiScheduler.generateStudySchedule(req.user, tasks, date);
    res.status(200).json({ success: true, message: 'Schedule regenerated', data: { date: dateStr, slots } });
  } catch (err) {
    next(err);
  }
};
