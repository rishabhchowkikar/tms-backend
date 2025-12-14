const express = require('express');
const { createDepotAdmin, getAllDepotAdmins, getAllStaff } = require('../controllers/superAdmin.controller.js');
const { protect, superAdminOnly } = require('../middleware/auth.middleware.js');
const router = express.Router();

router.post('/create-admin-by-superadmin', protect, superAdminOnly, createDepotAdmin);
router.get('/get-all-admin', protect, superAdminOnly, getAllDepotAdmins);
router.get('/get-all-staff', protect, getAllStaff)


module.exports = router;