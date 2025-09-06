const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const rateLimit = require('../middleware/rateLimit');

router.post('/summarize', rateLimit(5, 60000), aiController.summarizeText); // 5 requests per minute

module.exports = router;
