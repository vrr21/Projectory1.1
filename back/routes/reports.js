const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');

router.get('/employee/:id', reportController.getEmployeeReport);
router.get('/export-word/:id', reportController.exportToWord);

module.exports = router;
