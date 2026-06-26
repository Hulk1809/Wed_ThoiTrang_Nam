// routes/videotracking.js
const express = require('express');
const router = express.Router();
const TrackingController = require('../controllers/TrackingController');

router.post('/', TrackingController.logVideo);

// Static stats routes must come BEFORE the parameter route to prevent matching issues
router.get('/stats/top-videos', TrackingController.getTopVideos);
router.get('/stats/completion-rate', TrackingController.getVideoCompletionRate);
router.get('/stats/interest', TrackingController.getVideoInterestAnalysis);

// Parameter routes
router.get('/:userId', TrackingController.getVideoTrackings);
router.get('/', TrackingController.getVideoTrackings);

module.exports = router;
