const express = require('express');
const router = express.Router();
const exportEmployeeReportsController = require('../controllers/exportEmployeeReports.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/employee-reports', authMiddleware, exportEmployeeReportsController.exportEmployeeReportsHandler);

module.exports = router;
