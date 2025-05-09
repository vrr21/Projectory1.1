const express = require('express');
const router = express.Router();
const { exportTasksHandler } = require('../controllers/exportTasks.controller');

router.get('/tasks', exportTasksHandler);

module.exports = router;
