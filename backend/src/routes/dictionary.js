const express = require('express');
const router = express.Router();
const dictionaryController = require('../controllers/dictionaryController');

router.get('/', dictionaryController.getAllWords);
router.post('/', dictionaryController.addWord);
router.get('/:id', dictionaryController.getWord);
router.put('/:id', dictionaryController.updateWord);
router.delete('/:id', dictionaryController.deleteWord);
router.get('/search', dictionaryController.searchWords);

module.exports = router;
