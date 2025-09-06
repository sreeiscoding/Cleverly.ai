const express = require('express');
const router = express.Router();
const notesBreakdownController = require('../controllers/notesBreakdownController');
const rateLimit = require('../middleware/rateLimit');

router.post('/mind-map', rateLimit(5, 60000), notesBreakdownController.generateMindMap);
router.post('/study-guide', rateLimit(5, 60000), notesBreakdownController.generateStudyGuide);
router.post('/flashcards', rateLimit(5, 60000), notesBreakdownController.generateFlashcards);
router.get('/', notesBreakdownController.getUserNotesBreakdown);

module.exports = router;
