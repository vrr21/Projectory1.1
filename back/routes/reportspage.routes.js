const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportspage.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/orders', authMiddleware, controller.getOrdersStats);
router.get('/hours', authMiddleware, controller.getEmployeeHours);
router.get('/task-status-summary', authMiddleware, controller.getTaskStatusSummary);

module.exports = router;
