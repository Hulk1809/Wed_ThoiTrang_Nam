// routes/seed.js
const express = require('express');
const router = express.Router();
const SeedController = require('../controllers/SeedController');

router.post('/admin', SeedController.ensureAdminUser);
router.get('/demo-accounts', SeedController.getDemoAccounts);
router.post('/demo', SeedController.seedDemoData);

module.exports = router;
