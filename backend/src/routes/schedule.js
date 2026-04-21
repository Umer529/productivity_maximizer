const express = require('express');
const router = express.Router();
const { getSchedule, getWeeklySchedule, regenerateSchedule } = require('../controllers/scheduleController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getSchedule);
router.get('/weekly', getWeeklySchedule);
router.post('/regenerate', regenerateSchedule);

module.exports = router;
