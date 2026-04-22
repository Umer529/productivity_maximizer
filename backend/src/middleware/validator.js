const validateTask = (req, res, next) => {
  const { title, deadline, type, difficulty, estimatedDuration } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Task title is required' });
  }

  if (title.length > 200) {
    return res.status(400).json({ success: false, message: 'Task title must be less than 200 characters' });
  }

  if (!deadline) {
    return res.status(400).json({ success: false, message: 'Deadline is required' });
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid deadline format' });
  }

  if (type && !['assignment', 'quiz', 'midterm', 'final', 'project', 'other'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Invalid task type' });
  }

  if (difficulty !== undefined && (difficulty < 1 || difficulty > 5)) {
    return res.status(400).json({ success: false, message: 'Difficulty must be between 1 and 5' });
  }

  if (estimatedDuration !== undefined && (estimatedDuration < 5 || estimatedDuration > 480)) {
    return res.status(400).json({ success: false, message: 'Estimated duration must be between 5 and 480 minutes' });
  }

  next();
};

const validateProfileUpdate = (req, res, next) => {
  const { age, gender, socialMediaHours, netflixHours, attendancePercentage, sleepHours, mentalHealthRating } = req.body;

  if (age !== undefined && (age < 10 || age > 100)) {
    return res.status(400).json({ success: false, message: 'Age must be between 10 and 100' });
  }

  if (gender !== undefined && !['Male', 'Female', 'Other'].includes(gender)) {
    return res.status(400).json({ success: false, message: 'Invalid gender value' });
  }

  if (socialMediaHours !== undefined && (socialMediaHours < 0 || socialMediaHours > 24)) {
    return res.status(400).json({ success: false, message: 'Social media hours must be between 0 and 24' });
  }

  if (netflixHours !== undefined && (netflixHours < 0 || netflixHours > 24)) {
    return res.status(400).json({ success: false, message: 'Netflix hours must be between 0 and 24' });
  }

  if (attendancePercentage !== undefined && (attendancePercentage < 0 || attendancePercentage > 100)) {
    return res.status(400).json({ success: false, message: 'Attendance must be between 0 and 100' });
  }

  if (sleepHours !== undefined && (sleepHours < 0 || sleepHours > 24)) {
    return res.status(400).json({ success: false, message: 'Sleep hours must be between 0 and 24' });
  }

  if (mentalHealthRating !== undefined && (mentalHealthRating < 1 || mentalHealthRating > 10)) {
    return res.status(400).json({ success: false, message: 'Mental health rating must be between 1 and 10' });
  }

  next();
};

module.exports = { validateTask, validateProfileUpdate };
