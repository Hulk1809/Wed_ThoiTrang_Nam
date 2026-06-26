// routes/cart.js
const express = require('express');
const router = express.Router();
const CartController = require('../controllers/CartController');
const { authenticate } = require('../middleware/auth');

// Allow authenticate as middleware, but fallback to userId query param is supported in controller
router.get('/', authenticate, CartController.getCart);
router.post('/', authenticate, CartController.addToCart);
router.post('/add', authenticate, CartController.addToCart);
router.post('/sync', authenticate, CartController.sync);
router.put('/:id', authenticate, CartController.updateQuantity);
router.put('/item/:productId', authenticate, CartController.updateQuantityByProductId);
router.delete('/:id', authenticate, CartController.removeItem);
router.delete('/remove/:id', authenticate, CartController.removeItem);
router.delete('/', authenticate, CartController.clearCart);
router.delete('/clear', authenticate, CartController.clearCart);

module.exports = router;
