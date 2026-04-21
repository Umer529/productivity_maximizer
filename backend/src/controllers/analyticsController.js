const FocusSession = require('../models/FocusSession');
const Task         = require('../models/Task');
const aiScheduler  = require('../services/aiSchedulerService');

// GET /api/v1/analytics/overview
exports.getOverview = (req, res, next) => {
  try {
    const userId = req.user.id;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    // Completed sessions in last 7 days
    const recentCompleted = FocusSession.find({
      userId, startTime: sevenDaysAgoStr, completed: true,
    }, { limit: 1000 });

    // Weekly hours array [day0=Mon-6, ..., day6=today]
    const weeklyHoursMinutes = Array(7).fill(0);
    recentCompleted.forEach((s) => {
      const dayIndex = Math.floor(
        (new Date(s.startTime) - sevenDaysAgo) / (1000 * 60 * 60 * 24)
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        weeklyHoursMinutes[dayIndex] += s.actualDuration || 0;
      }
    });
    const weeklyHours = weeklyHoursMinutes.map((m) => +(m / 60).toFixed(2));
    const totalFocusMinutes = recentCompleted.reduce((s, x) => s + (x.actualDuration || 0), 0);

    // All-time completed sessions for course breakdown
    const allCompleted = FocusSession.find({ userId, completed: true }, { limit: 5000 });
    const courseMap = {};
    allCompleted.forEach((s) => {
      const course = s.taskId
        ? (Task.findById(s.taskId)?.course || 'General')
        : 'General';
      courseMap[course] = (courseMap[course] || 0) + (s.actualDuration || 0);
    });
    const totalCourseMin = Object.values(courseMap).reduce((a, b) => a + b, 0);
    const subjectBreakdown = Object.entries(courseMap).map(([name, minutes]) => ({
      name,
      hours: +(minutes / 60).toFixed(1),
      pct:   totalCourseMin > 0 ? Math.round((minutes / totalCourseMin) * 100) : 0,
    }));

    const tasks         = Task.find({ userId });
    const tasksCompleted = tasks.filter((t) => t.status === 'completed').length;
    const tasksPending   = tasks.filter((t) => ['pending', 'in_progress'].includes(t.status)).length;

    const allWeekSessions = FocusSession.find({ userId, startTime: sevenDaysAgoStr }, { limit: 1000 });
    const focusScore = allWeekSessions.length > 0
      ? Math.round((recentCompleted.length / allWeekSessions.length) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: { focusScore, totalFocusMinutes, streak: req.user.streak, tasksCompleted, tasksPending, weeklyHours, subjectBreakdown },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/insights
exports.getInsights = (req, res, next) => {
  try {
    const sessions = FocusSession.find({ userId: req.user.id }, { limit: 100 });
    const tasks    = Task.find({ userId: req.user.id });
    const insights = aiScheduler.getAIInsights(req.user, sessions, tasks);
    res.status(200).json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/history?days=14
exports.getStudyHistory = (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 14, 90);
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const sessions = FocusSession.find({
      userId: req.user.id,
      startTime: since.toISOString(),
      completed: true,
    }, { limit: 5000 });

    const history = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      const dayMinutes = sessions
        .filter((s) => s.startTime.startsWith(dateStr))
        .reduce((sum, s) => sum + (s.actualDuration || 0), 0);
      history.push({ date: dateStr, minutes: dayMinutes });
    }
    res.status(200).json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};
