const express = require('express');
const router = express.Router();

// Import controller functions (adjust the path and names as needed)
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Define auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.me);
router.put('/update-profile', authMiddleware, authController.updateProfile);

module.exports = router;

