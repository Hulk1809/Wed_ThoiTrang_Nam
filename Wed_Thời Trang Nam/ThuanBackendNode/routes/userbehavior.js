// routes/userbehavior.js
const express = require('express');
const router = express.Router();
const TrackingController = require('../controllers/TrackingController');

router.post('/', TrackingController.logBehavior);
router.get('/', TrackingController.getBehaviors);
router.get('/stats/event-stats', TrackingController.getEventStats);
router.get('/product-views/:productId', TrackingController.getProductViews);
router.get('/top-products', TrackingController.getTopProducts);

module.exports = router;
