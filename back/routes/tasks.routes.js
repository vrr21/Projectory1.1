const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');

// Базовые CRUD
router.get('/', taskController.getAllTasks);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Задачи конкретного сотрудника
router.get('/employee/:id', taskController.getTasksByEmployee);

module.exports = router;
