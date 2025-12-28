const express = require('express');

const { protect } = require('../middleware/auth.middleware.js');
const {getAllDepots} = require('../controllers/depotAdmin.Controller.js')

const router = express.Router();

router.use(protect);

router.get('/get-depots', getAllDepots);

module.exports = router;