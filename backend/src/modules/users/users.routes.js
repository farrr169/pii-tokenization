const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { listUsers, createUser, updateUser, deleteUser, toggleStatus } = require('./users.controller');

router.use(authenticate);

router.get('/',              authorize('read',   'users'), listUsers);
router.post('/',             authorize('create', 'users'), createUser);
router.put('/:id',           authorize('update', 'users'), updateUser);
router.delete('/:id',        authorize('delete', 'users'), deleteUser);
router.patch('/:id/status',  authorize('update', 'users'), toggleStatus);

module.exports = router;
