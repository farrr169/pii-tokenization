const express = require('express');
const router = express.Router();
const { login, logout, register, getProfile } = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.post('/login', login);
router.post('/register', register);
router.get('/profile', authenticate, getProfile);
router.post('/logout', authenticate, logout);

module.exports = router;
