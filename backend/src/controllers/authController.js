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
      // ML Feature Fields
      age: user.age,
      gender: user.gender,
      socialMediaHours: user.socialMediaHours,
      netflixHours: user.netflixHours,
      hasPartTimeJob: user.hasPartTimeJob,
      attendancePercentage: user.attendancePercentage,
      sleepHours: user.sleepHours,
      dietQuality: user.dietQuality,
      exerciseFrequency: user.exerciseFrequency,
      parentalEducationLevel: user.parentalEducationLevel,
      internetQuality: user.internetQuality,
      mentalHealthRating: user.mentalHealthRating,
      extraCurricularParticipation: user.extraCurricularParticipation,
      productivityIndex: user.productivityIndex,
      stressFactor: user.stressFactor,
      engagementScore: user.engagementScore,
      timeEfficiency: user.timeEfficiency,
      lifeBalanceScore: user.lifeBalanceScore,
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

// @route  PUT /api/v1/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const {
      // Preferences
      cgpaTarget,
      semester,
      studyHoursPerDay,
      focusDuration,
      breakDuration,
      longBreakDuration,
      longBreakAfter,
      namazBreaksEnabled,
      sleepStart,
      sleepEnd,
      studyStartTime,
      studyEndTime,
      // ML Feature Fields
      age,
      gender,
      socialMediaHours,
      netflixHours,
      hasPartTimeJob,
      attendancePercentage,
      sleepHours,
      dietQuality,
      exerciseFrequency,
      parentalEducationLevel,
      internetQuality,
      mentalHealthRating,
      extraCurricularParticipation,
      productivityIndex,
      stressFactor,
      engagementScore,
      timeEfficiency,
      lifeBalanceScore,
    } = req.body;

    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update preferences
    if (cgpaTarget !== undefined) user.cgpaTarget = cgpaTarget;
    if (semester !== undefined) user.semester = semester;
    if (studyHoursPerDay !== undefined) user.studyHoursPerDay = studyHoursPerDay;
    if (focusDuration !== undefined) user.focusDuration = focusDuration;
    if (breakDuration !== undefined) user.breakDuration = breakDuration;
    if (longBreakDuration !== undefined) user.longBreakDuration = longBreakDuration;
    if (longBreakAfter !== undefined) user.longBreakAfter = longBreakAfter;
    if (namazBreaksEnabled !== undefined) user.namazBreaksEnabled = namazBreaksEnabled;
    if (sleepStart !== undefined) user.sleepStart = sleepStart;
    if (sleepEnd !== undefined) user.sleepEnd = sleepEnd;
    if (studyStartTime !== undefined) user.studyStartTime = studyStartTime;
    if (studyEndTime !== undefined) user.studyEndTime = studyEndTime;

    // Update ML features
    if (age !== undefined) user.age = age;
    if (gender !== undefined) user.gender = gender;
    if (socialMediaHours !== undefined) user.socialMediaHours = socialMediaHours;
    if (netflixHours !== undefined) user.netflixHours = netflixHours;
    if (hasPartTimeJob !== undefined) user.hasPartTimeJob = hasPartTimeJob;
    if (attendancePercentage !== undefined) user.attendancePercentage = attendancePercentage;
    if (sleepHours !== undefined) user.sleepHours = sleepHours;
    if (dietQuality !== undefined) user.dietQuality = dietQuality;
    if (exerciseFrequency !== undefined) user.exerciseFrequency = exerciseFrequency;
    if (parentalEducationLevel !== undefined) user.parentalEducationLevel = parentalEducationLevel;
    if (internetQuality !== undefined) user.internetQuality = internetQuality;
    if (mentalHealthRating !== undefined) user.mentalHealthRating = mentalHealthRating;
    if (extraCurricularParticipation !== undefined) user.extraCurricularParticipation = extraCurricularParticipation;
    if (productivityIndex !== undefined) user.productivityIndex = productivityIndex;
    if (stressFactor !== undefined) user.stressFactor = stressFactor;
    if (engagementScore !== undefined) user.engagementScore = engagementScore;
    if (timeEfficiency !== undefined) user.timeEfficiency = timeEfficiency;
    if (lifeBalanceScore !== undefined) user.lifeBalanceScore = lifeBalanceScore;

    User.save(user);
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};
