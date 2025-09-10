const express = require('express');
const router = express.Router();
const notesBreakdownController = require('../controllers/notesBreakdownController');
const rateLimit = require('../middleware/rateLimit');

// AI Generation endpoints with rate limiting
router.post('/mind-map', rateLimit(5, 60000), notesBreakdownController.generateMindMap);
router.post('/study-guide', rateLimit(5, 60000), notesBreakdownController.generateStudyGuide);
router.post('/flashcards', rateLimit(5, 60000), notesBreakdownController.generateFlashcards);
router.post('/key-points', rateLimit(5, 60000), notesBreakdownController.generateKeyPoints);
router.post('/concept-map', rateLimit(5, 60000), notesBreakdownController.generateConceptMap);

// Integration with uploaded files
router.post('/process-upload', rateLimit(3, 60000), notesBreakdownController.processUploadedFile);
router.get('/uploads/available', notesBreakdownController.getUserUploadedFiles);

// Data retrieval endpoints
router.get('/', notesBreakdownController.getUserNotesBreakdown);
router.get('/:id', notesBreakdownController.getNotesBreakdownById);
router.get('/:id/status', notesBreakdownController.getProcessingStatus);

// Search and analytics endpoints
router.get('/search', notesBreakdownController.searchNotesBreakdown);
router.get('/stats/summary', notesBreakdownController.getBreakdownStats);

// Management endpoints
router.delete('/:id', notesBreakdownController.deleteNotesBreakdown);
router.put('/:id', notesBreakdownController.updateNotesBreakdown);

module.exports = router;
