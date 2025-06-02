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

// 🔹 Получить все задачи с деталями
router.get('/details', taskController.getTasksWithDetails);

// 🔹 Получить проекты по команде
router.get('/projects', taskController.getProjects);

// 🔹 Удалить задачи без исполнителя
router.delete('/unassigned', taskController.deleteUnassignedTasks);

// 🔹 Удалить все архивные задачи
router.delete('/archive/all', taskController.deleteAllArchivedTasks);

// 🔹 Получить все архивные задачи
router.get('/archived', taskController.getAllArchivedTasks);

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

// 🔹 Получить задачу по ID
router.get('/:id', taskController.getTaskById);

// 🔹 Получить задачу по ID с деталями
router.get('/:id/details', async (req, res) => {
  const { id } = req.params;
  try {
    await poolConnect;

    // Основной запрос задачи
    const taskResult = await pool.request()
      .input('ID_Task', sql.Int, id)
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
          tm.Team_Name
        FROM Tasks t
        LEFT JOIN Statuses s ON t.ID_Status = s.ID_Status
        LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
        LEFT JOIN Teams tm ON o.ID_Team = tm.ID_Team
        WHERE t.ID_Task = @ID_Task
      `);

    if (!taskResult.recordset.length) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    // Запрос главного исполнителя
    const assignedResult = await pool.request()
      .input('ID_Task', sql.Int, id)
      .query(`
        SELECT TOP 1 a.ID_Employee
        FROM Assignment a
        WHERE a.ID_Task = @ID_Task
        ORDER BY a.ID_Employee ASC
      `);

    // Запрос всех сотрудников
    const employeesResult = await pool.request()
      .input('ID_Task', sql.Int, id)
      .query(`
        SELECT 
          u.ID_User,
          u.First_Name,
          u.Last_Name,
          u.Avatar
        FROM Assignment a
        INNER JOIN Users u ON a.ID_Employee = u.ID_User
        WHERE a.ID_Task = @ID_Task
      `);

    // Формирование объекта задачи
    const task = {
      ...taskResult.recordset[0],
      Assigned_Employee_Id: assignedResult.recordset[0]?.ID_Employee || null,
      Employees: employeesResult.recordset.map(emp => ({
        ID_Employee: emp.ID_User,
        Full_Name: `${emp.First_Name} ${emp.Last_Name}`,
        Avatar: emp.Avatar
      }))
    };

    res.json(task);
  } catch (error) {
    console.error('🔥 Ошибка при получении задачи с деталями:', error);
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// 🔹 Архивировать задачу
router.put('/:id/archive', taskController.archiveTask);

// 🔹 Обновить задачу
router.put('/:id', taskController.updateTask);

// 🔹 Закрыть задачу
router.patch('/:id/close', taskController.closeTask);

// 🔹 Обновить статус задачи для конкретного сотрудника
router.put('/:taskId/status', taskController.updateEmployeeTaskStatus);

// 🔹 Создать задачу
router.post('/', taskController.createTask);

// 🔹 Удалить задачу
router.delete('/:id', taskController.deleteTask);

module.exports = router;
