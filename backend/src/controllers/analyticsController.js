const FocusSession = require('../models/FocusSession');
const Task         = require('../models/Task');
const aiScheduler  = require('../services/aiSchedulerService');
const mlScheduler  = require('../services/mlScheduler');

// GET /api/v1/analytics/overview
exports.getOverview = async (req, res, next) => {
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

    // Get ML predictions for productivity insights
    let mlPredictions = null;
    try {
      mlPredictions = await mlScheduler.getProductivityPredictions(req.user);
    } catch (mlError) {
      console.error('ML predictions failed:', mlError.message);
    }

    res.status(200).json({
      success: true,
      data: { 
        focusScore, 
        totalFocusMinutes, 
        streak: req.user.streak, 
        tasksCompleted, 
        tasksPending, 
        weeklyHours, 
        subjectBreakdown,
        mlPredictions 
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/insights
exports.getInsights = async (req, res, next) => {
  try {
    const sessions = FocusSession.find({ userId: req.user.id }, { limit: 100 });
    const tasks    = Task.find({ userId: req.user.id });
    const insights = aiScheduler.getAIInsights(req.user, sessions, tasks);
    
    // Add ML-based insights
    try {
      const mlPredictions = await mlScheduler.getProductivityPredictions(req.user);

      // Add burnout risk insight
      const burnoutRisk = mlPredictions.burnout_risk;
      if (burnoutRisk) {
        if (burnoutRisk.level === 'critical') {
          insights.push({
            type: 'warning',
            text: `ML Prediction: CRITICAL burnout risk (${burnoutRisk.score}/100). Take immediate action: reduce study hours, improve sleep, and take breaks.`
          });
        } else if (burnoutRisk.level === 'high') {
          insights.push({
            type: 'warning',
            text: `ML Prediction: High burnout risk (${burnoutRisk.score}/100). Consider reducing workload and prioritizing self-care.`
          });
        } else if (burnoutRisk.level === 'moderate') {
          insights.push({
            type: 'tip',
            text: `ML Prediction: Moderate burnout risk (${burnoutRisk.score}/100). Monitor your stress levels and ensure adequate rest.`
          });
        }
      }

      // Add burnout factor insights
      if (burnoutRisk?.factors) {
        if (burnoutRisk.factors.stress > 25) {
          insights.push({
            type: 'tip',
            text: `ML Insight: High stress detected. Consider mindfulness exercises or reducing non-essential commitments.`
          });
        }
        if (burnoutRisk.factors.sleep > 7) {
          insights.push({
            type: 'tip',
            text: `ML Insight: Sleep patterns need improvement. Aim for 7-8 hours of quality sleep for better productivity.`
          });
        }
      }

      // Add productivity insight
      const prodScore = mlPredictions.productivity_score?.value || 50;
      if (prodScore < 40) {
        insights.push({
          type: 'prediction',
          text: `ML Prediction: Current productivity score is ${prodScore.toFixed(0)}/100. Focus on improving sleep and reducing distractions.`
        });
      } else if (prodScore >= 80) {
        insights.push({
          type: 'tip',
          text: `ML Prediction: Excellent productivity (${prodScore.toFixed(0)}/100). Maintain your current study habits!`
        });
      }

      // Add break interval insight
      const breakInterval = mlPredictions.break_interval?.value || 25;
      insights.push({
        type: 'tip',
        text: `ML Recommendation: Optimal break interval is ${breakInterval.toFixed(0)} minutes based on your stress levels.`
      });
    } catch (mlError) {
      console.error('ML insights failed:', mlError.message);
    }
    
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
