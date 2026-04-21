const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/predictions', mlController.getProductivityPredictions);
router.post('/analyze-tasks', mlController.analyzeTasks);

module.exports = router;
