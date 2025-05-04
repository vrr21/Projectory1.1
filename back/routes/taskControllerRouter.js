// backend/routes/taskControllerRouter.js
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');  // Подключаем контроллер задач

// Маршрут для получения задач по проекту
router.get('/tasks', taskController.getTasksByProject);

module.exports = router;
