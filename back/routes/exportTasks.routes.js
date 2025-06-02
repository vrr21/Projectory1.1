// back/routes/exportTasks.routes.js

const express = require('express');
const router = express.Router();
const { exportTasksHandler } = require('../controllers/exportTasks.controller');

// Экспорт задач
router.get('/:format', exportTasksHandler);

module.exports = router;
