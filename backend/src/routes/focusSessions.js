const express = require('express');
const router = express.Router();
const {
  startSession, endSession, getSessions, getActiveSession,
} = require('../controllers/focusSessionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/start', startSession);
router.get('/active', getActiveSession);
router.get('/', getSessions);
router.put('/:id/end', endSession);

module.exports = router;
