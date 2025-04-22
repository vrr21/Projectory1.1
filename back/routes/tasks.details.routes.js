const express = require('express');
const router = express.Router();
const { pool, sql } = require('../config/db');

// GET /api/tasks/with-details
// Получение задач с деталями: команда, сотрудник, проект
router.get('/with-details', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        t.ID_Task,
        t.Task_Name,
        t.Description,
        t.Time_Norm,
        s.Status_Name,
        o.Order_Name,
        tm.Team_Name,
        u.First_Name + ' ' + u.Last_Name AS Employee_Name
      FROM Tasks t
      LEFT JOIN Statuses s ON t.ID_Status = s.ID_Status
      LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
      LEFT JOIN Teams tm ON o.ID_Team = tm.ID_Team
      LEFT JOIN Assignment a ON t.ID_Task = a.ID_Task
      LEFT JOIN Users u ON a.ID_Employee = u.ID_User
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении расширенных задач:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
