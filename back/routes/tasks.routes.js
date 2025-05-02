const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { poolConnect, pool, sql } = require('../config/db');

// 🔹 Получить все задачи (с фильтрами: ?employee=2&team=1)
router.get('/', taskController.getAllTasks);

// 🔹 Создать задачу
router.post('/', taskController.createTask);

// 🔹 Обновить задачу
router.put('/:id', taskController.updateTask);

// 🔹 Удалить задачу
router.delete('/:id', taskController.deleteTask);

// 🔹 Получить задачи конкретного сотрудника
router.get('/employee/:id', taskController.getTasksByEmployee);

// 🔹 Поиск задач по имени или описанию
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    await poolConnect;
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
