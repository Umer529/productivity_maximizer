const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validator');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/profile', protect, validateProfileUpdate, updateProfile);

module.exports = router;
