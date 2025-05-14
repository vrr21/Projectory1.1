const express = require('express');
const router = express.Router();
const controller = require('../controllers/executions.controller');

// Удаление всех Execution записей по ID_Task
router.delete('/task/:taskId', controller.deleteExecutionsByTask);

module.exports = router;
