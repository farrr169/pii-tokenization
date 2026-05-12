const express = require('express');
const router = express.Router();
const { tokenizeSingle, tokenizeBatch, getResults, getStats } = require('./tokenization.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

router.use(authenticate);

router.post('/tokenize', authorize('execute', 'tokenization'), tokenizeSingle);
router.post('/batch', authorize('execute', 'tokenization'), tokenizeBatch);
router.get('/results', authorize('read', 'tokenization'), getResults);
router.get('/stats', authorize('read', 'tokenization'), getStats);

module.exports = router;
