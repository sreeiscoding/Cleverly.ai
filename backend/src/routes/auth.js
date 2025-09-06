const express = require('express');
const router = express.Router();

// Import controller functions (adjust the path and names as needed)
const authController = require('../controllers/authController');

// Define auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.me);

module.exports = router;
