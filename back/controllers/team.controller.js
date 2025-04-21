const { pool, poolConnect } = require('../config/db');

// Получение всех команд
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
          ID_Team: row.id,
          Team_Name: row.name,
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

// ✅ Создание команды
const createTeam = async (req, res) => {
  try {
    await poolConnect;
    const { Team_Name } = req.body;

    if (!Team_Name) {
      return res.status(400).json({ error: 'Название команды обязательно' });
    }

    const result = await pool
      .request()
      .input('Team_Name', Team_Name)
      .query('INSERT INTO Teams (Team_Name) OUTPUT INSERTED.ID_Team VALUES (@Team_Name)');

    const newTeam = {
      ID_Team: result.recordset[0].ID_Team,
      Team_Name,
    };

    res.status(201).json(newTeam);
  } catch (error) {
    console.error('Ошибка при создании команды:', error);
    res.status(500).json({ error: 'Не удалось создать команду' });
  }
};

module.exports = { getAllTeams, createTeam };
