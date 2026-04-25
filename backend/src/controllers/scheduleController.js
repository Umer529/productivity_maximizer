const Task        = require('../models/Task');
const aiScheduler = require('../services/aiSchedulerService');
const mlScheduler  = require('../services/mlScheduler');

// Returns today's ISO date string (YYYY-MM-DD) in local server time
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Clamp a date string to today if it's in the past
function clampToToday(dateStr) {
  const today = todayStr();
  return dateStr < today ? today : dateStr;
}

// GET /api/v1/schedule?date=YYYY-MM-DD&method=ml|heuristic
exports.getSchedule = async (req, res, next) => {
  try {
    const rawDate = req.query.date || todayStr();
    const method = req.query.method || 'ml';
    const dateStr = clampToToday(rawDate); // silently redirect past dates → today
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const tasks = Task.find({ userId: req.user.id }).filter((t) => t.status !== 'completed');
    
    let result;
    if (method === 'ml') {
      try {
        result = await mlScheduler.generateDailySchedule(req.user, tasks, date);
        result.method = 'ml-optimized';
      } catch (mlError) {
        console.error('ML schedule generation failed, falling back to heuristic:', mlError.message);
        const slots = aiScheduler.generateStudySchedule(req.user, tasks, date);
        result = { date: dateStr, slots, method: 'heuristic-fallback' };
      }
    } else {
      const slots = aiScheduler.generateStudySchedule(req.user, tasks, date);
      result = { date: dateStr, slots, method: 'heuristic' };
    }
    
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/schedule/weekly?method=ml|heuristic
exports.getWeeklySchedule = async (req, res, next) => {
  try {
    const method = req.query.method || 'ml';
    const tasks = Task.find({ userId: req.user.id }).filter((t) => t.status !== 'completed');
    
    let week;
    if (method === 'ml') {
      try {
        week = await mlScheduler.generateWeeklySchedule(req.user, tasks);
        week = week.map(day => ({ ...day, method: 'ml-optimized' }));
      } catch (mlError) {
        console.error('ML weekly schedule generation failed, falling back to heuristic:', mlError.message);
        week = aiScheduler.generateWeeklySchedule(req.user, tasks);
        week = week.map(day => ({ ...day, method: 'heuristic-fallback' }));
      }
    } else {
      week = aiScheduler.generateWeeklySchedule(req.user, tasks);
      week = week.map(day => ({ ...day, method: 'heuristic' }));
    }
    
    res.status(200).json({ success: true, data: week });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/schedule/regenerate
exports.regenerateSchedule = async (req, res, next) => {
  try {
    const rawDate = req.body.date || todayStr();
    const method = req.body.method || 'ml';
    const dateStr = clampToToday(rawDate); // silently redirect past dates → today
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const tasks = Task.find({ userId: req.user.id }).filter((t) => t.status !== 'completed');
    
    let result;
    if (method === 'ml') {
      try {
        result = await mlScheduler.generateDailySchedule(req.user, tasks, date);
        result.method = 'ml-optimized';
      } catch (mlError) {
        console.error('ML schedule regeneration failed, falling back to heuristic:', mlError.message);
        const slots = aiScheduler.generateStudySchedule(req.user, tasks, date);
        result = { date: dateStr, slots, method: 'heuristic-fallback' };
      }
    } else {
      const slots = aiScheduler.generateStudySchedule(req.user, tasks, date);
      result = { date: dateStr, slots, method: 'heuristic' };
    }
    
    res.status(200).json({ success: true, message: 'Schedule regenerated', data: result });
  } catch (err) {
    next(err);
  }
};
