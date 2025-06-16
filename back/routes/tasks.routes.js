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

// 🔹 Проверить просроченные задачи
router.patch('/check-overdue', taskController.checkAndUpdateOverdueTasks);

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

// 🔹 Получить задачи по проекту (исключая архивные)
router.get('/by-project/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    await poolConnect;
    const request = pool.request();
    request.input('ProjectId', sql.Int, projectId);

    const result = await request.query(`
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
        a.ID_Employee AS Assigned_Employee_Id,
        u.ID_User,
        u.First_Name + ' ' + u.Last_Name AS Employee_Name,
        u.Avatar
      FROM Tasks t
      LEFT JOIN Statuses s ON t.ID_Status = s.ID_Status
      LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
      LEFT JOIN Teams tm ON o.ID_Team = tm.ID_Team
      LEFT JOIN Assignment a ON a.ID_Task = t.ID_Task
      LEFT JOIN Users u ON a.ID_Employee = u.ID_User
      WHERE t.ID_Order = @ProjectId
        AND s.Status_Name != 'Архив'
    `);

    const tasksMap = {};
    result.recordset.forEach(row => {
      const taskId = row.ID_Task;

      if (!tasksMap[taskId]) {
        tasksMap[taskId] = {
          ID_Task: row.ID_Task,
          Task_Name: row.Task_Name,
          Description: row.Description,
          Time_Norm: row.Time_Norm,
          Deadline: row.Deadline,
          Status_Name: row.Status_Name,
          Order_Name: row.Order_Name,
          ID_Order: row.ID_Order,
          Team_Name: row.Team_Name,
          Assigned_Employee_Id: row.Assigned_Employee_Id,
          Employees: [],
        };
      }

      if (row.ID_User && row.Employee_Name) {
        tasksMap[taskId].Employees.push({
          ID_Employee: row.ID_User,
          Full_Name: row.Employee_Name,
          Avatar: row.Avatar ?? null,
        });
      }
    });

    const tasks = Object.values(tasksMap);
    res.json(tasks);
  } catch (error) {
    console.error('🔥 Ошибка при получении задач для проекта:', error);
    res.status(500).json({ error: 'Ошибка при получении задач для проекта', details: error.message });
  }
});

// 🔹 Получить задачу по ID
router.get('/:id', taskController.getTaskById);

// 🔹 Получить задачу по ID с деталями
router.get('/:id/details', async (req, res) => {
  const { id } = req.params;
  try {
    await poolConnect;

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

    const assignedResult = await pool.request()
      .input('ID_Task', sql.Int, id)
      .query(`
        SELECT TOP 1 a.ID_Employee
        FROM Assignment a
        WHERE a.ID_Task = @ID_Task
        ORDER BY a.ID_Employee ASC
      `);

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

// ✅ 🔹 Обновить статус задачи для сотрудника (исправлено!)
router.patch('/:taskId/status', taskController.updateEmployeeTaskStatus);

// 🔹 Обновить общий статус задачи
router.put('/:id/status', taskController.updateTaskStatus);

// 🔹 Создать задачу
router.post('/', taskController.createTask);

// 🔹 Удалить задачу
router.delete('/:id', taskController.deleteTask);

module.exports = router;
