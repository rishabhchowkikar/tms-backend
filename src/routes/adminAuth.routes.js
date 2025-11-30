const express = require('express');
const { signup, login, logout } = require('../controllers/adminAuth.controller.js')
const { protect, superAdminOnly } = require('../middleware/auth.middleware.js')
const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/super-admin-logout', protect, superAdminOnly, logout);
module.exports = router;