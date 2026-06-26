// routes/orders.js
const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, OrderController.placeOrder);
router.post('/create', authenticate, OrderController.placeOrder);
router.get('/', authenticate, OrderController.getOrderHistory);
router.get('/history', authenticate, OrderController.getOrderHistory);
router.get('/all', authenticate, authorize('admin'), OrderController.getAllOrders);
router.get('/status/:status', authenticate, authorize('admin'), OrderController.getOrdersByStatus);
router.get('/:id', authenticate, OrderController.getOrderById);
router.put('/:id/status', authenticate, authorize('admin'), OrderController.updateOrderStatus);
router.delete('/:id', authenticate, authorize('admin'), OrderController.deleteOrder);

module.exports = router;
