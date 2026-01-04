const express = require('express');
const { createDepotAdmin, getAllDepotAdmins, getAllStaff,getAllDepotsWithAdmins, getAdminDepotDetails,changeAdminPassword } = require('../controllers/superAdmin.controller.js');
const { protect, superAdminOnly } = require('../middleware/auth.middleware.js');
const router = express.Router();

router.post('/create-admin-by-superadmin', protect, superAdminOnly, createDepotAdmin);
router.get('/get-all-admin', protect, superAdminOnly, getAllDepotAdmins);
router.get('/get-all-staff', protect, superAdminOnly, getAllStaff)
router.get('/get-all-depots-with-admins', protect, superAdminOnly, getAllDepotsWithAdmins);
router.get('/get-admin-depot-details/:adminId', protect, superAdminOnly, getAdminDepotDetails);
router.patch('/change-admin-password', protect, superAdminOnly, changeAdminPassword);


module.exports = router;