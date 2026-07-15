const express = require('express');
const router = express.Router();
const { tokenizeSingle, tokenizeBatch, detokenize, getResults, getStats, deleteResult, clearResults } = require('./tokenization.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

router.use(authenticate);

router.post('/tokenize',    authorize('execute', 'tokenization'), tokenizeSingle);
router.post('/batch',       authorize('execute', 'tokenization'), tokenizeBatch);
router.post('/detokenize',  authorize('execute', 'tokenization'), detokenize);
router.get('/results',      authorize('read',    'tokenization'), getResults);
router.get('/stats',        authorize('read',    'tokenization'), getStats);
router.delete('/results',   authorize('execute', 'tokenization'), clearResults);
router.delete('/results/:id', authorize('execute', 'tokenization'), deleteResult);

module.exports = router;
