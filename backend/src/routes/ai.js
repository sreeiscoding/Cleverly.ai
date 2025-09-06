const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/summarize', aiController.summarizeText);

module.exports = router;
