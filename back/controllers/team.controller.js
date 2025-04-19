const { sql, pool, poolConnect } = require('../config/db');

// Получить все команды с участниками
const getAllTeams = async (req, res) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      SELECT t.ID_Team AS id, t.Team_Name AS name,
             u.ID_User AS userId, u.First_Name + ' ' + u.Last_Name AS fullName, u.Email,
             tm.Role
      FROM Teams t
      LEFT JOIN TeamMembers tm ON t.ID_Team = tm.ID_Team
      LEFT JOIN Users u ON tm.ID_User = u.ID_User
    `);

    const teamMap = {};

    for (const row of result.recordset) {
      if (!teamMap[row.id]) {
        teamMap[row.id] = {
          id: row.id,
          name: row.name,
          members: [],
        };
      }

      if (row.userId) {
        teamMap[row.id].members.push({
          id: row.userId,
          fullName: row.fullName,
          email: row.Email,
          role: row.Role || '',
        });
      }
    }

    res.json(Object.values(teamMap));
  } catch (error) {
    console.error('Ошибка получения команд:', error);
    res.status(500).json({ error: 'Ошибка при получении команд' });
  }
};

// Создание новой команды (с проверкой на дубликат названия)
const createTeam = async (req, res) => {
  const { name } = req.body;

  try {
    await poolConnect;

    const duplicate = await pool.request()
      .input('name', sql.NVarChar, name.trim())
      .query('SELECT COUNT(*) as count FROM Teams WHERE Team_Name = @name');

    if (duplicate.recordset[0].count > 0) {
      return res.status(400).json({ message: 'Команда с таким названием уже существует' });
    }

    const insert = await pool.request()
      .input('name', sql.NVarChar, name.trim())
      .query('INSERT INTO Teams (Team_Name) OUTPUT INSERTED.ID_Team AS id VALUES (@name)');

    const newId = insert.recordset[0].id;

    res.status(201).json({ id: newId, name, members: [] });
  } catch (error) {
    console.error('Ошибка создания команды:', error);
    res.status(500).json({ error: 'Ошибка при создании команды' });
  }
};

module.exports = {
  getAllTeams,
  createTeam,
};
