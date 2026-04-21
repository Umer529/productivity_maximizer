const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const taskRoutes = require('./tasks');
const courseRoutes = require('./courses');
const scheduleRoutes = require('./schedule');
const analyticsRoutes = require('./analytics');
const focusSessionRoutes = require('./focusSessions');
const profileRoutes = require('./profile');

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/courses', courseRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/focus-sessions', focusSessionRoutes);
router.use('/profile', profileRoutes);

module.exports = router;
