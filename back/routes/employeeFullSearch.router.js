const express = require('express');
const router = express.Router();
const { poolConnect, pool, sql } = require('../config/db');

// Поиск данных сотрудника
router.get('/fullsearch', async (req, res) => {
  const { q, employeeEmail } = req.query;

  if (!q || !employeeEmail) {
    return res.status(400).json({ message: 'Отсутствуют обязательные параметры' });
  }

  try {
    await poolConnect;
    const searchQuery = `%${q}%`;

    // Найти ID пользователя по email
    const userResult = await pool.request()
      .input('email', sql.NVarChar, employeeEmail)
      .query(`SELECT ID_User FROM Users WHERE Email = @email`);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const employeeId = userResult.recordset[0].ID_User;

    const tasksPromise = pool.request()
      .input('query', sql.NVarChar, searchQuery)
      .input('employeeId', sql.Int, employeeId)
      .query(`
        SELECT 
          'task' AS type,
          t.ID_Task AS id,
          t.Task_Name AS name,
          t.Description AS extra
        FROM Tasks t
        INNER JOIN Assignment a ON t.ID_Task = a.ID_Task
        WHERE a.ID_Employee = @employeeId AND (t.Task_Name LIKE @query OR t.Description LIKE @query)
      `);

    const ordersPromise = pool.request()
      .input('query', sql.NVarChar, searchQuery)
      .input('employeeId', sql.Int, employeeId)
      .query(`
        SELECT 
          'order' AS type,
          o.ID_Order AS id,
          o.Order_Name AS name,
          o.Status AS extra
        FROM Orders o
        INNER JOIN Teams tm ON o.ID_Team = tm.ID_Team
        INNER JOIN TeamMembers tmm ON tm.ID_Team = tmm.ID_Team
        WHERE tmm.ID_User = @employeeId AND o.Order_Name LIKE @query
      `);

    const teamsPromise = pool.request()
      .input('query', sql.NVarChar, searchQuery)
      .input('employeeId', sql.Int, employeeId)
      .query(`
        SELECT 
          'team' AS type,
          tm.ID_Team AS id,
          tm.Team_Name AS name,
          NULL AS extra
        FROM Teams tm
        INNER JOIN TeamMembers tmm ON tm.ID_Team = tmm.ID_Team
        WHERE tmm.ID_User = @employeeId AND tm.Team_Name LIKE @query
      `);

    const [tasks, orders, teams] = await Promise.all([
      tasksPromise, ordersPromise, teamsPromise,
    ]);

    const result = [
      ...tasks.recordset,
      ...orders.recordset,
      ...teams.recordset,
    ];

    res.json(result);
  } catch (error) {
    console.error('Ошибка поиска данных сотрудника:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
