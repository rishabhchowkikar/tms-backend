const express = require('express');
const { protect, depotAdminOnly } = require('../middleware/auth.middleware.js')
const { addStaff, getMyStaff, transferStaff } = require('../controllers/depotAdmin.Controller.js')

const router = express.Router();

router.use(protect, depotAdminOnly);

router.post('/add-staff', addStaff);
router.post('/transfer-staff', protect, depotAdminOnly, transferStaff) // only super-admin and depot-admin can change their own staff
router.get('/get-staff', getMyStaff);

module.exports = router