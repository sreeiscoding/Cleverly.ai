const express = require('express');
const router = express.Router();
const multer = require('multer');
const filesController = require('../controllers/filesController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), filesController.uploadFile);
router.get('/list', filesController.listFiles);
router.get('/search', filesController.searchFiles);

module.exports = router;
