const jwt = require('jsonwebtoken');
const User = require('../models/User');

function sendTokenResponse(user, statusCode, res) {
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      streak: user.streak,
      totalStudyMinutes: user.totalStudyMinutes,
      preferences: {
        cgpaTarget:          user.cgpaTarget,
        semester:            user.semester,
        studyHoursPerDay:    user.studyHoursPerDay,
        focusDuration:       user.focusDuration,
        breakDuration:       user.breakDuration,
        longBreakDuration:   user.longBreakDuration,
        longBreakAfter:      user.longBreakAfter,
        namazBreaksEnabled:  user.namazBreaksEnabled,
        sleepStart:          user.sleepStart,
        sleepEnd:            user.sleepEnd,
        studyStartTime:      user.studyStartTime,
        studyEndTime:        user.studyEndTime,
      },
    },
  });
}

// @route  POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({ name, email, password });
    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @route  POST /api/v1/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }
    const user = User.findOne({ email }, { includePassword: true });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @route  GET /api/v1/auth/me
exports.getMe = (req, res) => {
  res.status(200).json({ success: true, data: req.user });
};

// @route  POST /api/v1/auth/logout
exports.logout = (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
