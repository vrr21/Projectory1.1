const express = require('express');
const router = express.Router();
const exportReportsController = require('../controllers/exportReports.controller');

// Исправляем метод GET на POST
router.post('/', exportReportsController.exportReportsHandler);

module.exports = router;
