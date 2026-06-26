// routes/users.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticate, authorize } = require('../middleware/auth');

// All user management routes require admin role
router.use(authenticate, authorize('admin'));

router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);
router.get('/role/:role', UserController.getUsersByRole);
router.put('/:id/role', UserController.changeUserRole);

module.exports = router;
