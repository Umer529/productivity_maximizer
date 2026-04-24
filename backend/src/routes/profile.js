const express = require('express');
const router = express.Router();
const {
  getProfile, updateProfile, updatePassword, getPreferences, updatePreferences,
  getMLFeatures, updateMLFeatures,
} = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getProfile).put(updateProfile);
router.put('/password', updatePassword);
router.route('/preferences').get(getPreferences).put(updatePreferences);
router.route('/ml-features').get(getMLFeatures).put(updateMLFeatures);

module.exports = router;
