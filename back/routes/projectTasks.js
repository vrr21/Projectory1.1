const express = require('express');
const router = express.Router();
const { sql, poolConnect } = require('../config/db');

router.get('/:projectId/tasks', async (req, res) => {
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
    res.status(500).json({ error: 'Ошибка при получении задач для проекта' });
  }
});


module.exports = router;
