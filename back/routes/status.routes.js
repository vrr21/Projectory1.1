const express = require('express');
const router = express.Router();
const { getAllStatuses } = require('../controllers/status.controller');

// 🔹 GET /api/statuses
router.get('/', getAllStatuses);

module.exports = router;
