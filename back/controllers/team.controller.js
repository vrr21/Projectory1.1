const { pool, poolConnect } = require('../config/db');
const sql = require('mssql');

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

// Создание команды
const createTeam = async (req, res) => {
  try {
    await poolConnect;
    const { Team_Name } = req.body;

    if (!Team_Name) {
      return res.status(400).json({ error: 'Название команды обязательно' });
    }

    const result = await pool
      .request()
      .input('Team_Name', sql.NVarChar, Team_Name)
      .query('INSERT INTO Teams (Team_Name) OUTPUT INSERTED.ID_Team VALUES (@Team_Name)');

    const newTeam = {
      ID_Team: result.recordset[0].ID_Team,
      Team_Name,
      members: [],
    };

    res.status(201).json(newTeam);
  } catch (error) {
    console.error('Ошибка при создании команды:', error);
    res.status(500).json({ error: 'Не удалось создать команду' });
  }
};

// Добавление участника
const addTeamMember = async (req, res) => {
  try {
    await poolConnect;
    const { teamId, fullName, email, role } = req.body;

    if (!teamId || !fullName || !email || !role) {
      return res.status(400).json({ message: 'Все поля обязательны' });
    }

    const userResult = await pool
      .request()
      .input('Email', sql.NVarChar, email)
      .query('SELECT ID_User FROM Users WHERE Email = @Email');

    if (userResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Пользователь с таким email не найден' });
    }

    const userId = userResult.recordset[0].ID_User;

    const existsResult = await pool
      .request()
      .input('ID_User', userId)
      .input('ID_Team', teamId)
      .query('SELECT 1 FROM TeamMembers WHERE ID_User = @ID_User AND ID_Team = @ID_Team');

    if (existsResult.recordset.length > 0) {
      return res.status(400).json({ message: 'Пользователь уже является участником команды' });
    }

    await pool
      .request()
      .input('ID_User', userId)
      .input('ID_Team', teamId)
      .input('Role', sql.NVarChar, role)
      .query('INSERT INTO TeamMembers (ID_User, ID_Team, Role) VALUES (@ID_User, @ID_Team, @Role)');

    res.status(201).json({ message: 'Участник успешно добавлен' });
  } catch (error) {
    console.error('Ошибка добавления участника:', error);
    res.status(500).json({ message: 'Ошибка сервера при добавлении участника' });
  }
};

// Удаление участника
const removeTeamMember = async (req, res) => {
  try {
    await poolConnect;
    const { teamId, memberId } = req.params;

    await pool
      .request()
      .input('ID_Team', teamId)
      .input('ID_User', memberId)
      .query('DELETE FROM TeamMembers WHERE ID_Team = @ID_Team AND ID_User = @ID_User');

    res.status(200).json({ message: 'Участник удалён' });
  } catch (error) {
    console.error('Ошибка при удалении участника:', error);
    res.status(500).json({ message: 'Ошибка при удалении участника' });
  }
};

// Удаление команды
const deleteTeam = async (req, res) => {
  try {
    await poolConnect;
    const { teamId } = req.params;

    await pool
      .request()
      .input('ID_Team', teamId)
      .query('DELETE FROM TeamMembers WHERE ID_Team = @ID_Team; DELETE FROM Teams WHERE ID_Team = @ID_Team');

    res.status(200).json({ message: 'Команда удалена' });
  } catch (error) {
    console.error('Ошибка при удалении команды:', error);
    res.status(500).json({ message: 'Ошибка при удалении команды' });
  }
};

module.exports = {
  getAllTeams,
  createTeam,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
};
