const express = require('express');
const router = express.Router();
const mcqController = require('../controllers/mcqController');

router.get('/', mcqController.getAllMCQs);
router.post('/', mcqController.createMCQ);
router.get('/:id', mcqController.getMCQ);
router.put('/:id', mcqController.updateMCQ);
router.delete('/:id', mcqController.deleteMCQ);

module.exports = router;
