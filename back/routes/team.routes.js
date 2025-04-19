const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../config/db');

// Получить все команды с участниками
router.get('/teams', async (req, res) => {
  try {
    await poolConnect;

    const teamRes = await pool.request()
      .query('SELECT ID_Team AS id, Team_Name AS name FROM Teams');

    const memberRes = await pool.request()
      .query(`
        SELECT tm.ID_Team, u.ID_User AS id, u.First_Name + ' ' + u.Last_Name AS fullName, u.Email, ISNULL(tm.Role, '') AS role
        FROM TeamMembers tm
        JOIN Users u ON tm.ID_User = u.ID_User
      `);

    const teams = teamRes.recordset.map(team => ({
      ...team,
      members: memberRes.recordset
        .filter(m => m.ID_Team === team.id)
        .map(m => ({
          id: m.id,
          fullName: m.fullName,
          email: m.Email,
          role: m.role,
        })),
    }));

    res.json(teams);
  } catch (err) {
    console.error('Ошибка получения команд:', err);
    res.status(500).json({ error: 'Ошибка при получении команд' });
  }
});

// Создать команду
// Создать команду с проверкой на дублирование имени
router.post('/teams', async (req, res) => {
  const { name } = req.body;

  try {
    await poolConnect;

    // Проверка на существующее название
    const checkRes = await pool.request()
      .input('name', sql.NVarChar, name)
      .query('SELECT 1 FROM Teams WHERE Team_Name = @name');

    if (checkRes.recordset.length > 0) {
      return res.status(400).json({ message: 'Команда с таким названием уже существует' });
    }

    // Вставка новой команды
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .query(`
        INSERT INTO Teams (Team_Name)
        OUTPUT INSERTED.ID_Team AS id
        VALUES (@name)
      `);

    res.status(201).json({ id: result.recordset[0].id, name, members: [] });
  } catch (err) {
    console.error('Ошибка создания команды:', err);
    res.status(500).json({ error: 'Ошибка при создании команды' });
  }
});


// Добавить участника в команду
router.post('/team/add', async (req, res) => {
  const { teamId, fullName, email, role } = req.body;

  try {
    await poolConnect;

    const userRes = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT ID_User FROM Users WHERE Email = @email');

    if (userRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Пользователь с таким email не найден' });
    }

    const userId = userRes.recordset[0].ID_User;

    const existsRes = await pool.request()
      .input('teamId', sql.Int, teamId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 1 FROM TeamMembers 
        WHERE ID_Team = @teamId AND ID_User = @userId
      `);

    if (existsRes.recordset.length > 0) {
      return res.status(409).json({ error: 'Участник уже в команде' });
    }

    await pool.request()
      .input('teamId', sql.Int, teamId)
      .input('userId', sql.Int, userId)
      .input('role', sql.NVarChar, role)
      .query(`
        INSERT INTO TeamMembers (ID_Team, ID_User, Role)
        VALUES (@teamId, @userId, @role)
      `);

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Ошибка добавления участника:', err);
    res.status(500).json({ error: 'Ошибка при добавлении участника в команду' });
  }
});

// Удалить участника из команды
router.delete('/team/:teamId/remove/:userId', async (req, res) => {
  const { teamId, userId } = req.params;
  try {
    await poolConnect;

    await pool.request()
      .input('teamId', sql.Int, teamId)
      .input('userId', sql.Int, userId)
      .query('DELETE FROM TeamMembers WHERE ID_Team = @teamId AND ID_User = @userId');

    res.sendStatus(204);
  } catch (err) {
    console.error('Ошибка удаления участника:', err);
    res.status(500).json({ error: 'Ошибка при удалении участника' });
  }
});

// Удалить команду
router.delete('/teams/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await poolConnect;

    await pool.request().input('id', sql.Int, id).query(`
      DELETE FROM TeamMembers WHERE ID_Team = @id;
      DELETE FROM Teams WHERE ID_Team = @id;
    `);

    res.sendStatus(204);
  } catch (err) {
    console.error('Ошибка удаления команды:', err);
    res.status(500).json({ error: 'Ошибка при удалении команды' });
  }
});

module.exports = router;
