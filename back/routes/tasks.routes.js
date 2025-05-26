// back/routes/tasks.routes.js

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { poolConnect, pool, sql } = require('../config/db');

// 🔹 Получение задач сотрудника по ID с логом
router.get('/employee/:id', (req, res, next) => {
  console.log('Получен запрос на задачи сотрудника с ID:', req.params.id);
  next();
}, taskController.getTasksByEmployee);

// 🔹 Поиск задач по ключевым словам (название, описание)
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
    res.status(500).json({ message: 'Ошибка поиска задач', error: error.message });
  }
});

// 🔹 Получение всех задач с деталями (включая сотрудников, статусы, команды)
router.get('/details', taskController.getTasksWithDetails);

// 🔹 Удаление задач без сотрудников (для автоматической очистки)
router.delete('/without-employees', taskController.deleteTasksWithoutEmployees);

// 🔹 Создание новой задачи
router.post('/', taskController.createTask);

// 🔹 Обновление задачи по ID
router.put('/:id', taskController.updateTask);

// 🔹 Удаление задачи по ID
router.delete('/:id', taskController.deleteTask);

// 🔹 Закрытие задачи — смена статуса на "Завершена"
router.patch('/:id/close', taskController.closeTask);

// 🔹 Обновление статуса задачи конкретного сотрудника
router.put('/:taskId/status', taskController.updateEmployeeTaskStatus);
router.put('/:taskId/update-status', taskController.updateEmployeeTaskStatus); // Альтернативный URL

// 🔹 Получение всех задач с фильтрами (по сотруднику, по команде)
router.get('/', taskController.getAllTasks);
router.patch('/:id/archive', taskController.archiveTask);


// Проверка существования сотрудников
router.post('/check-employees', taskController.checkEmployeesExist);



module.exports = router;
