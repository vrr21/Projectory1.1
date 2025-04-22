const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');

// Получить все задачи (или отфильтрованные)
router.get('/', taskController.getAllTasks);

// CRUD задачи
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Получить задачи по сотруднику
router.get('/employee/:id', taskController.getTasksByEmployee);

module.exports = router;
