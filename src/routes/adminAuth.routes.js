const express = require('express');
const { signup, login, logout, getMe } = require('../controllers/adminAuth.controller.js')
const { protect, superAdminOnly } = require('../middleware/auth.middleware.js')
const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/admin-logout', protect, logout);

router.get('/me', protect, getMe);
module.exports = router;