const { sql, poolConnect, pool } = require('../config/db');

exports.getEmployeeTasksByType = async (req, res) => {
  const userEmail = req.query.email;
  if (!userEmail) return res.status(400).send('Email обязателен');

  try {
    await poolConnect;
    const request = pool.request();
    request.input('email', sql.NVarChar, userEmail);
    const result = await request.query(`
      SELECT pt.Type_Name AS Task_Type, COUNT(t.ID_Task) AS Task_Count, CAST(t.Deadline AS DATE) AS Task_Date
      FROM Tasks t
      JOIN Orders o ON t.ID_Order = o.ID_Order
      JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
      JOIN Assignment a ON t.ID_Task = a.ID_Task
      JOIN Users u ON a.ID_Employee = u.ID_User
      WHERE u.Email = @email AND t.Deadline IS NOT NULL
      GROUP BY pt.Type_Name, CAST(t.Deadline AS DATE)
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка получения задач по типу для сотрудника:', err);
    res.status(500).send('Ошибка получения данных');
  }
};

exports.getEmployeeTasksByProject = async (req, res) => {
  const userEmail = req.query.email;
  if (!userEmail) return res.status(400).send('Email обязателен');

  try {
    await poolConnect;
    const request = pool.request();
    request.input('email', sql.NVarChar, userEmail);
    const result = await request.query(`
      SELECT o.Order_Name AS Project_Name, COUNT(t.ID_Task) AS Task_Count, CAST(t.Deadline AS DATE) AS Task_Date
      FROM Tasks t
      JOIN Orders o ON t.ID_Order = o.ID_Order
      JOIN Assignment a ON t.ID_Task = a.ID_Task
      JOIN Users u ON a.ID_Employee = u.ID_User
      WHERE u.Email = @email AND t.Deadline IS NOT NULL
      GROUP BY o.Order_Name, CAST(t.Deadline AS DATE)
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка получения задач по проекту для сотрудника:', err);
    res.status(500).send('Ошибка получения данных');
  }
};

exports.getEmployeeKanbanOverview = async (req, res) => {
  const userEmail = req.query.email;
  if (!userEmail) return res.status(400).send('Email обязателен');

  try {
    await poolConnect;
    const request = pool.request();
    request.input('email', sql.NVarChar, userEmail);
    const result = await request.query(`
      SELECT t.ID_Task, t.Task_Name, t.Description, s.Status_Name, o.Order_Name, tm.Team_Name, t.Deadline
      FROM Tasks t
      JOIN Statuses s ON t.ID_Status = s.ID_Status
      JOIN Orders o ON t.ID_Order = o.ID_Order
      JOIN Teams tm ON o.ID_Team = tm.ID_Team
      JOIN Assignment a ON t.ID_Task = a.ID_Task
      JOIN Users u ON a.ID_Employee = u.ID_User
      WHERE u.Email = @email
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка получения Kanban данных для сотрудника:', err);
    res.status(500).send('Ошибка получения данных');
  }
};

exports.getEmployeeTimeTracking = async (req, res) => {
  const userEmail = req.query.email;
  if (!userEmail) return res.status(400).send('Email обязателен');

  try {
    await poolConnect;
    const request = pool.request();
    request.input('email', sql.NVarChar, userEmail);
    const result = await request.query(`
      SELECT t.Task_Name, e.Hours_Spent, e.Start_Date, e.End_Date
      FROM Execution e
      JOIN Tasks t ON e.ID_Task = t.ID_Task
      JOIN Users u ON e.ID_Employee = u.ID_User
      WHERE u.Email = @email AND e.Hours_Spent IS NOT NULL AND e.Hours_Spent > 0
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка получения отчета времени для сотрудника:', err);
    res.status(500).send('Ошибка получения данных');
  }
};
