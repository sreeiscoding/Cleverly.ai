const express = require('express');
const router = express.Router();
const notesBreakdownController = require('../controllers/notesBreakdownController');
const rateLimit = require('../middleware/rateLimit');

// AI Generation endpoints with rate limiting
router.post('/mind-map', rateLimit(5, 60000), notesBreakdownController.generateMindMap);
router.post('/study-guide', rateLimit(5, 60000), notesBreakdownController.generateStudyGuide);
router.post('/flashcards', rateLimit(5, 60000), notesBreakdownController.generateFlashcards);

// Integration with uploaded files
router.post('/process-upload', rateLimit(3, 60000), notesBreakdownController.processUploadedFile);
router.get('/uploaded-files', notesBreakdownController.getUserUploadedFiles);

// Data retrieval endpoints
router.get('/', notesBreakdownController.getUserNotesBreakdown);
router.get('/:id', notesBreakdownController.getNotesBreakdownById);
router.get('/:id/status', notesBreakdownController.getProcessingStatus);

// Management endpoints
router.delete('/:id', notesBreakdownController.deleteNotesBreakdown);
router.put('/:id', notesBreakdownController.updateNotesBreakdown);

module.exports = router;
