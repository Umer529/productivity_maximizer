const User = require('../models/User');
const mlScheduler = require('../services/mlScheduler');

// GET /api/v1/ml/predictions
exports.getProductivityPredictions = async (req, res, next) => {
  try {
    const predictions = await mlScheduler.getProductivityPredictions(req.user);
    res.status(200).json({ success: true, data: predictions });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/ml/analyze-tasks
exports.analyzeTasks = async (req, res, next) => {
  try {
    const { tasks } = req.body;
    
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ success: false, message: 'Tasks must be an array' });
    }
    
    const features = mlScheduler._extractStudentFeatures(req.user);
    const mlTasks = tasks.map(t => ({
      name: t.title || t.name,
      deadline: t.deadline,
      difficulty: t.difficulty || 3,
      estimated_hours: t.estimated_hours || t.estimatedDuration || 2
    }));
    
    const result = await mlScheduler.predictStudent(features, mlTasks, 'all');
    
    if (result.error) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
