const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { poolConnect, pool, sql } = require('../config/db');

// Получить все задачи (или отфильтрованные)
router.get('/', taskController.getAllTasks);

// CRUD задачи
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Получить задачи по сотруднику
router.get('/employee/:id', taskController.getTasksByEmployee);

// Поиск задач
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    await poolConnect; // ✅ Используем готовое подключение
    const result = await pool.request()
      .input('query', sql.NVarChar, `%${q}%`)
      .query(`
        SELECT ID_Task, Task_Name
        FROM Tasks
        WHERE Task_Name LIKE @query OR Description LIKE @query
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка поиска задач:', error);
    res.status(500).json({ message: 'Ошибка поиска задач' });
  }
});

module.exports = router;
