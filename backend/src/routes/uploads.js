const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadsController = require('../controllers/uploadsController');

const upload = multer({ storage: multer.memoryStorage() });

// Legacy single file upload
router.post('/notes', upload.single('file'), uploadsController.uploadNote);

// Chunked upload endpoints
router.post('/init', uploadsController.initChunkedUpload);
router.post('/chunk', upload.single('chunk'), uploadsController.uploadChunk);
router.put('/:uploadId/pause', uploadsController.pauseUpload);
router.put('/:uploadId/resume', uploadsController.resumeUpload);
router.delete('/:uploadId', uploadsController.deleteUpload);
router.get('/:uploadId/progress', uploadsController.getUploadProgress);
router.get('/:uploadId/download', uploadsController.downloadFile);
router.get('/user/uploads', uploadsController.getUserUploads);

// Existing endpoints
router.get('/notes', uploadsController.getNotes);
router.get('/notes/search', uploadsController.searchUploadNotes);
router.delete('/notes/:noteId', uploadsController.deleteNote);

// New favorites endpoints
router.post('/notes/:noteId/favorite', uploadsController.toggleFavorite);
router.get('/favorites', uploadsController.getFavoriteFiles);

// New folders endpoints
router.post('/folders', uploadsController.createFolder);
router.get('/folders', uploadsController.getFolders);
router.post('/folders/add-file', uploadsController.addFileToFolder);
router.get('/folders/:folderId/files', uploadsController.getFolderFiles);
router.delete('/folders/:folderId', uploadsController.deleteFolder);

module.exports = router;
