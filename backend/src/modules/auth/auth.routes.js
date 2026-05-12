// auth.routes.js
const express = require('express');
const router = express.Router();
const { login, register, getProfile } = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.post('/login', login);
router.post('/register', register);
router.get('/profile', authenticate, getProfile);

module.exports = router;
