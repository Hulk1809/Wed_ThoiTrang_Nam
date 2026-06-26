// routes/products.js
const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', ProductController.getAll);
router.get('/search', ProductController.search);
router.get('/:id', ProductController.getById);

// Admin-only endpoints
router.post('/', authenticate, authorize('admin'), ProductController.create);
router.put('/:id', authenticate, authorize('admin'), ProductController.update);
router.delete('/:id', authenticate, authorize('admin'), ProductController.delete);

module.exports = router;
