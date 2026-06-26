// routes/datamining.js
const express = require('express');
const router = express.Router();
const DataMiningController = require('../controllers/DataMiningController');

router.post('/kmeans', DataMiningController.runKMeans);
router.get('/analysis', DataMiningController.getBehaviorAnalysis);
router.get('/users-detail', DataMiningController.getUsersBehaviorDetail);
router.get('/ad-strategy', DataMiningController.generateAdStrategy);

module.exports = router;
