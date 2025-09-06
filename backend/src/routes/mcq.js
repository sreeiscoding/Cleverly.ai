const express = require('express');
const router = express.Router();
const mcqController = require('../controllers/mcqController');
const rateLimit = require('../middleware/rateLimit');

router.get('/', mcqController.getAllMCQs);
router.post('/', rateLimit(5, 60000), mcqController.createMCQ); // 5 requests per minute
router.get('/:id', mcqController.getMCQ);
router.put('/:id', mcqController.updateMCQ);
router.delete('/:id', mcqController.deleteMCQ);

module.exports = router;
