const User   = require('../models/User');
const Course = require('../models/Course');
const bcrypt = require('bcryptjs');

// GET /api/v1/profile
exports.getProfile = (req, res, next) => {
  try {
    const courses = Course.find({ userId: req.user.id });
    res.status(200).json({ success: true, data: { ...req.user, courses } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/profile
exports.updateProfile = (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name              !== undefined) updates.name              = String(req.body.name).trim();
    if (req.body.cgpaTarget        !== undefined) updates.cgpaTarget        = Number(req.body.cgpaTarget);
    if (req.body.semester          !== undefined) updates.semester          = Number(req.body.semester);
    if (req.body.studyHoursPerDay  !== undefined) updates.studyHoursPerDay  = Number(req.body.studyHoursPerDay);
    if (req.body.focusDuration     !== undefined) updates.focusDuration     = Number(req.body.focusDuration);
    if (req.body.breakDuration     !== undefined) updates.breakDuration     = Number(req.body.breakDuration);
    if (req.body.longBreakDuration !== undefined) updates.longBreakDuration = Number(req.body.longBreakDuration);
    if (req.body.longBreakAfter    !== undefined) updates.longBreakAfter    = Number(req.body.longBreakAfter);
    if (req.body.namazBreaksEnabled  !== undefined) updates.namazBreaksEnabled  = Boolean(req.body.namazBreaksEnabled);
    if (req.body.selectedNamazPrayers !== undefined) updates.selectedNamazPrayers = req.body.selectedNamazPrayers;
    if (req.body.sleepStart          !== undefined) updates.sleepStart          = String(req.body.sleepStart);
    if (req.body.sleepEnd            !== undefined) updates.sleepEnd            = String(req.body.sleepEnd);
    if (req.body.studyStartTime      !== undefined) updates.studyStartTime      = String(req.body.studyStartTime);
    if (req.body.studyEndTime        !== undefined) updates.studyEndTime        = String(req.body.studyEndTime);

    const user = User.update(req.user.id, updates);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/profile/password
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide currentPassword and newPassword' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const user = User.findById(req.user.id, { includePassword: true });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    const salt    = await bcrypt.genSalt(10);
    const hashed  = await bcrypt.hash(newPassword, salt);
    User.update(req.user.id, { password: hashed });
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/profile/preferences
exports.updatePreferences = (req, res, next) => {
  try {
    const updates = {};
    if (req.body.cgpaTarget        !== undefined) updates.cgpaTarget        = Number(req.body.cgpaTarget);
    if (req.body.semester          !== undefined) updates.semester          = Number(req.body.semester);
    if (req.body.studyHoursPerDay  !== undefined) updates.studyHoursPerDay  = Number(req.body.studyHoursPerDay);
    if (req.body.focusDuration     !== undefined) updates.focusDuration     = Number(req.body.focusDuration);
    if (req.body.breakDuration     !== undefined) updates.breakDuration     = Number(req.body.breakDuration);
    if (req.body.longBreakDuration !== undefined) updates.longBreakDuration = Number(req.body.longBreakDuration);
    if (req.body.longBreakAfter    !== undefined) updates.longBreakAfter    = Number(req.body.longBreakAfter);
    if (req.body.namazBreaksEnabled  !== undefined) updates.namazBreaksEnabled  = Boolean(req.body.namazBreaksEnabled);
    if (req.body.selectedNamazPrayers !== undefined) updates.selectedNamazPrayers = req.body.selectedNamazPrayers;
    if (req.body.sleepStart          !== undefined) updates.sleepStart          = String(req.body.sleepStart);
    if (req.body.sleepEnd            !== undefined) updates.sleepEnd            = String(req.body.sleepEnd);
    if (req.body.studyStartTime      !== undefined) updates.studyStartTime      = String(req.body.studyStartTime);
    if (req.body.studyEndTime        !== undefined) updates.studyEndTime        = String(req.body.studyEndTime);

    const user = User.update(req.user.id, updates);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/profile/preferences
exports.getPreferences = (req, res) => {
  const u = req.user;
  res.status(200).json({
    success: true,
    data: {
      cgpaTarget:          u.cgpaTarget,
      semester:            u.semester,
      studyHoursPerDay:    u.studyHoursPerDay,
      focusDuration:       u.focusDuration,
      breakDuration:       u.breakDuration,
      longBreakDuration:   u.longBreakDuration,
      longBreakAfter:      u.longBreakAfter,
      namazBreaksEnabled:   u.namazBreaksEnabled,
      selectedNamazPrayers: u.selectedNamazPrayers || [],
      sleepStart:           u.sleepStart,
      sleepEnd:            u.sleepEnd,
      studyStartTime:      u.studyStartTime,
      studyEndTime:        u.studyEndTime,
    },
  });
};

// PUT /api/v1/profile/ml-features
exports.updateMLFeatures = (req, res, next) => {
  try {
    const updates = {};
    
    // ML Feature Fields from request body
    if (req.body.age !== undefined) updates.age = Number(req.body.age);
    if (req.body.gender !== undefined) updates.gender = String(req.body.gender);
    if (req.body.socialMediaHours !== undefined) updates.socialMediaHours = Number(req.body.socialMediaHours);
    if (req.body.netflixHours !== undefined) updates.netflixHours = Number(req.body.netflixHours);
    if (req.body.hasPartTimeJob !== undefined) updates.hasPartTimeJob = Boolean(req.body.hasPartTimeJob);
    if (req.body.attendancePercentage !== undefined) updates.attendancePercentage = Number(req.body.attendancePercentage);
    if (req.body.sleepHours !== undefined) updates.sleepHours = Number(req.body.sleepHours);
    if (req.body.dietQuality !== undefined) updates.dietQuality = String(req.body.dietQuality);
    if (req.body.exerciseFrequency !== undefined) updates.exerciseFrequency = Number(req.body.exerciseFrequency);
    if (req.body.parentalEducationLevel !== undefined) updates.parentalEducationLevel = String(req.body.parentalEducationLevel);
    if (req.body.internetQuality !== undefined) updates.internetQuality = String(req.body.internetQuality);
    if (req.body.mentalHealthRating !== undefined) updates.mentalHealthRating = Number(req.body.mentalHealthRating);
    if (req.body.extraCurricularParticipation !== undefined) updates.extraCurricularParticipation = Boolean(req.body.extraCurricularParticipation);
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No ML features provided' });
    }
    
    const user = User.update(req.user.id, updates);
    res.status(200).json({ success: true, message: 'ML features updated', data: user });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/profile/ml-features
exports.getMLFeatures = (req, res) => {
  const u = req.user;
  res.status(200).json({
    success: true,
    data: {
      age: u.age,
      gender: u.gender,
      socialMediaHours: u.socialMediaHours,
      netflixHours: u.netflixHours,
      hasPartTimeJob: u.hasPartTimeJob,
      attendancePercentage: u.attendancePercentage,
      sleepHours: u.sleepHours,
      dietQuality: u.dietQuality,
      exerciseFrequency: u.exerciseFrequency,
      parentalEducationLevel: u.parentalEducationLevel,
      internetQuality: u.internetQuality,
      mentalHealthRating: u.mentalHealthRating,
      extraCurricularParticipation: u.extraCurricularParticipation,
      productivityIndex: u.productivityIndex,
      stressFactor: u.stressFactor,
      engagementScore: u.engagementScore,
      timeEfficiency: u.timeEfficiency,
      lifeBalanceScore: u.lifeBalanceScore,
    },
  });
};
