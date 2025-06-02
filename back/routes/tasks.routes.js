const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { poolConnect, pool, sql } = require('../config/db');

// 🔹 Лог ID перед выполнением контроллера
router.get('/employee/:id', (req, res, next) => {
  console.log('Получен запрос на задачи сотрудника с ID:', req.params.id);
  next();
}, taskController.getTasksByEmployee);

// 🔹 Получить все задачи
router.get('/', taskController.getAllTasks);

// 🔹 Получить задачу по ID (⬅️ добавлено)
router.get('/:id', taskController.getTaskById);

// 🔹 Поиск задач
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
    console.error('🔥 Ошибка поиска задач:', error);
    res.status(500).json({ message: 'Ошибка поиска задач', error: error.message });
  }
});
router.get('/:id/details', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.request()
      .input('ID_Task', id)
      .query(`
        SELECT 
          t.ID_Task,
          t.Task_Name,
          t.Description,
          t.Time_Norm,
          t.Deadline,
          s.Status_Name,
          o.Order_Name,
          o.ID_Order,
          tm.Team_Name,
          u.ID_User,
          u.First_Name + ' ' + u.Last_Name AS Employee_Name,
          u.Avatar
        FROM Tasks t
        LEFT JOIN Statuses s ON t.ID_Status = s.ID_Status
        LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
        LEFT JOIN Teams tm ON o.ID_Team = tm.ID_Team
        LEFT JOIN Assignment a ON t.ID_Task = a.ID_Task
        LEFT JOIN Users u ON a.ID_Employee = u.ID_User
        WHERE t.ID_Task = @ID_Task
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    const taskRows = result.recordset;
    const task = {
      ID_Task: taskRows[0].ID_Task,
      Task_Name: taskRows[0].Task_Name,
      Description: taskRows[0].Description,
      Time_Norm: taskRows[0].Time_Norm,
      Deadline: taskRows[0].Deadline,
      Status_Name: taskRows[0].Status_Name,
      Order_Name: taskRows[0].Order_Name,
      ID_Order: taskRows[0].ID_Order,
      Team_Name: taskRows[0].Team_Name,
      Employees: []
    };

    for (const row of taskRows) {
      if (row.ID_User) {
        task.Employees.push({
          id: row.ID_User,
          fullName: row.Employee_Name,
          avatar: row.Avatar ?? null
        });
      }
    }

    res.json(task);
  } catch (error) {
    console.error('Ошибка при получении задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// 🔹 Получить все задачи с деталями
router.get('/details', taskController.getTasksWithDetails);

// 🔹 Получить проекты по команде
router.get('/projects', taskController.getProjects);

// 🔹 Создать задачу
router.post('/', taskController.createTask);

// 🔹 Удалить задачи без исполнителя
router.delete('/unassigned', taskController.deleteUnassignedTasks);

// 🔹 Удалить все архивные задачи
router.delete('/archive/all', taskController.deleteAllArchivedTasks);

// 🔹 Закрыть задачу
router.patch('/:id/close', taskController.closeTask);

// 🔹 Обновить статус задачи для конкретного сотрудника
router.put('/:taskId/status', taskController.updateEmployeeTaskStatus);

// 🔹 Обновить задачу
router.put('/:id', taskController.updateTask);

// 🔹 Удалить задачу
router.delete('/:id', taskController.deleteTask);

module.exports = router;
