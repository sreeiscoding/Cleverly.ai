const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadsController = require('../controllers/uploadsController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/notes', upload.single('file'), uploadsController.uploadNote);
router.get('/notes', uploadsController.getNotes);
router.get('/notes/search', uploadsController.searchUploadNotes);

module.exports = router;
