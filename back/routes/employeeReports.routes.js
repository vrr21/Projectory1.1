const express = require('express');
const router = express.Router();
const employeeReportsController = require('../controllers/employeeReports.controller');

router.get('/tasks-by-type', employeeReportsController.getEmployeeTasksByType);
router.get('/tasks-by-project', employeeReportsController.getEmployeeTasksByProject);
router.get('/kanban-overview', employeeReportsController.getEmployeeKanbanOverview);
router.get('/time-tracking', employeeReportsController.getEmployeeTimeTracking);

module.exports = router;
