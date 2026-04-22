const express = require('express');
const router = express.Router();
const {
  getTasks, getTask, createTask, updateTask, deleteTask, updateProgress, getTaskStats,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { validateTask } = require('../middleware/validator');

router.use(protect);

router.get('/stats', getTaskStats);
router.route('/').get(getTasks).post(validateTask, createTask);
router.route('/:id').get(getTask).put(validateTask, updateTask).delete(deleteTask);
router.patch('/:id/progress', updateProgress);

module.exports = router;
