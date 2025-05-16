const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');

router.get('/tasks-by-project-type', reportsController.getTasksByProjectTypeAndPeriod);
router.get('/tasks-by-employee', reportsController.getTasksByEmployeeAndPeriod);
router.get('/tasks-by-project', reportsController.getTasksByProjectAndPeriod);
router.get('/kanban-overview', reportsController.getKanbanOverview);
router.get('/employee-time-tracking', reportsController.getEmployeeTimeTracking);

module.exports = router;
