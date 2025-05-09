// routes/exportReports.routes.js
const express = require('express');
const router = express.Router();
const exportReportsController = require('../controllers/exportReports.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/reports', authMiddleware, exportReportsController.exportReportsHandler);

module.exports = router;
