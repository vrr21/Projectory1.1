const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/with-details', async (req, res) => {
  try {
    const result = await pool.request().query(`
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
    `);

    const map = new Map();

    for (const row of result.recordset) {
      if (!map.has(row.ID_Task)) {
        map.set(row.ID_Task, {
          ID_Task: row.ID_Task,
          Task_Name: row.Task_Name,
          Description: row.Description,
          Time_Norm: row.Time_Norm,
          Deadline: row.Deadline,
          Status_Name: row.Status_Name,
          Order_Name: row.Order_Name,
          ID_Order: row.ID_Order,
          Team_Name: row.Team_Name,
          Employees: [],
        });
      }

      if (row.ID_User) {
        const task = map.get(row.ID_Task);
        if (!task.Employees.some(e => e.id === row.ID_User)) {
          task.Employees.push({
            id: row.ID_User,
            fullName: row.Employee_Name,
            avatar: row.Avatar ?? null
          });
        }
      }
    }

    res.json(Array.from(map.values()));
  } catch (error) {
    console.error('Ошибка при получении расширенных задач:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
