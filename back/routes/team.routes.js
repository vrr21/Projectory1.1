//routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../config/db');

// Получение всех команд с участниками
router.get('/teams', async (req, res) => {
  try {
    await poolConnect;

    const teamsResult = await pool.request()
      .query('SELECT ID_Team AS id, Team_Name AS name FROM Teams');

    const membersResult = await pool.request()
      .query(`
        SELECT tm.ID_Team, u.ID_User AS id, u.First_Name + ' ' + u.Last_Name AS fullName, u.Email AS email
        FROM TeamMembers tm
        JOIN Users u ON tm.ID_User = u.ID_User
      `);

    const teams = teamsResult.recordset.map(team => ({
      ...team,
      members: membersResult.recordset.filter(m => m.ID_Team === team.id),
    }));

    res.json(teams);  // Возвращаем команды с участниками
  } catch (err) {
    console.error('Ошибка получения команд:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение всех сотрудников
router.get('/members', async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`
        SELECT ID_User AS id, First_Name + ' ' + Last_Name AS fullName, Email AS email 
        FROM Users 
        WHERE ID_Role = 2
      `);
    res.json(result.recordset);  // Возвращаем сотрудников
  } catch (err) {
    console.error('Ошибка получения сотрудников:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создание новой команды
router.post('/teams/create', async (req, res) => {
  const { name } = req.body;
  try {
    await poolConnect;

    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .query('INSERT INTO Teams (Team_Name) OUTPUT INSERTED.ID_Team AS id VALUES (@name)');

    res.status(201).json({ id: result.recordset[0].id, name, members: [] });
  } catch (err) {
    console.error('Ошибка создания команды:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
