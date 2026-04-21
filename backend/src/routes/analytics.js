const express = require('express');
const router = express.Router();
const { getOverview, getInsights, getStudyHistory } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/overview', getOverview);
router.get('/insights', getInsights);
router.get('/history', getStudyHistory);

module.exports = router;
