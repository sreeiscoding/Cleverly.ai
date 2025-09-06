const express = require('express');
const router = express.Router();
const aiImagesController = require('../controllers/aiImagesController');
const rateLimit = require('../middleware/rateLimit');

router.post('/generate', rateLimit(3, 60000), aiImagesController.generateImage); // 3 requests per minute for images
router.get('/', aiImagesController.getUserImages);
router.delete('/:id', aiImagesController.deleteImage);

module.exports = router;
