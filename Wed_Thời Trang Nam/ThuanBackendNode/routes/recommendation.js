// routes/recommendation.js
const express = require('express');
const router = express.Router();
const RecommendationController = require('../controllers/RecommendationController');

router.get('/', RecommendationController.getRecommendations);
router.get('/segment', RecommendationController.getUserSegment);
router.get('/top-clusters', RecommendationController.getAllClusters);

module.exports = router;
