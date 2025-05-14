const { pool, poolConnect } = require('../config/db');
const sql = require('mssql');

// Получение всех команд
const getAllTeams = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT t.ID_Team AS id, t.Team_Name AS name, t.Status,
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
          Status: row.Status,
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

// Вспомогательная проверка существования команды с таким названием
const teamExistsByName = async (teamName, excludeId = null) => {
  const request = pool.request().input('Team_Name', sql.NVarChar, teamName.trim());
  if (excludeId) {
    request.input('ID_Team', excludeId);
  }
  const query = excludeId
    ? 'SELECT 1 FROM Teams WHERE Team_Name = @Team_Name AND ID_Team != @ID_Team'
    : 'SELECT 1 FROM Teams WHERE Team_Name = @Team_Name';
  const result = await request.query(query);
  return result.recordset.length > 0;
};

// Создание команды
const createTeam = async (req, res) => {
  try {
    await poolConnect;
    const { Team_Name } = req.body;

    if (!Team_Name) {
      return res.status(400).json({ error: 'Название команды обязательно' });
    }

    if (await teamExistsByName(Team_Name)) {
      return res.status(400).json({ error: 'Команда с таким названием уже существует' });
    }

    const result = await pool
      .request()
      .input('Team_Name', sql.NVarChar, Team_Name.trim())
      .query('INSERT INTO Teams (Team_Name, Status) OUTPUT INSERTED.ID_Team VALUES (@Team_Name, \'В процессе\')');

    res.status(201).json({
      ID_Team: result.recordset[0].ID_Team,
      Team_Name,
      members: [],
    });
  } catch (error) {
    console.error('Ошибка при создании команды:', error);
    res.status(500).json({ error: 'Не удалось создать команду' });
  }
};

// Обновление названия команды
const updateTeamName = async (req, res) => {
  try {
    await poolConnect;
    const { teamId } = req.params;
    const { Team_Name } = req.body;

    if (!Team_Name) {
      return res.status(400).json({ message: 'Новое название обязательно' });
    }

    if (await teamExistsByName(Team_Name, teamId)) {
      return res.status(400).json({ message: 'Команда с таким названием уже существует' });
    }

    await pool
      .request()
      .input('ID_Team', teamId)
      .input('Team_Name', sql.NVarChar, Team_Name.trim())
      .query('UPDATE Teams SET Team_Name = @Team_Name WHERE ID_Team = @ID_Team');

    res.status(200).json({ message: 'Название команды обновлено' });
  } catch (error) {
    console.error('Ошибка при обновлении названия команды:', error);
    res.status(500).json({ message: 'Ошибка при обновлении названия команды' });
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

// Полное удаление команды
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

// Архивация команды
const archiveTeam = async (req, res) => {
  try {
    await poolConnect;
    const { teamId } = req.params;

    await pool
      .request()
      .input('ID_Team', teamId)
      .input('Status', sql.NVarChar, 'Архив')
      .query('UPDATE Teams SET Status = @Status WHERE ID_Team = @ID_Team');

    res.status(200).json({ message: 'Команда отправлена в архив' });
  } catch (error) {
    console.error('Ошибка при архивации команды:', error);
    res.status(500).json({ message: 'Ошибка при архивации команды' });
  }
};

// Восстановление команды
const restoreTeam = async (req, res) => {
  try {
    await poolConnect;
    const { teamId } = req.params;

    await pool
      .request()
      .input('ID_Team', teamId)
      .input('Status', sql.NVarChar, 'В процессе')
      .query('UPDATE Teams SET Status = @Status WHERE ID_Team = @ID_Team');

    res.status(200).json({ message: 'Команда восстановлена' });
  } catch (error) {
    console.error('Ошибка при восстановлении команды:', error);
    res.status(500).json({ message: 'Ошибка при восстановлении команды' });
  }
};
// Архивация команды с закрытием проектов и завершением задач
const archiveTeamWithProjectsAndTasks = async (req, res) => {
  try {
    await poolConnect;
    const { teamId } = req.params;

    // Закрыть все проекты команды
    await pool.request()
      .input('ID_Team', teamId)
      .input('ProjectStatus', sql.NVarChar, 'Закрыт')
      .query('UPDATE Projects SET Status = @ProjectStatus WHERE ID_Team = @ID_Team');

    // Завершить все задачи проектов этой команды
    await pool.request()
      .input('ID_Team', teamId)
      .input('TaskStatus', sql.NVarChar, 'Завершена')
      .query(`
        UPDATE Tasks
        SET Status = @TaskStatus
        WHERE ID_Project IN (SELECT ID_Project FROM Projects WHERE ID_Team = @ID_Team)
      `);

    // Перевести команду в статус "Архив"
    await pool.request()
      .input('ID_Team', teamId)
      .input('Status', sql.NVarChar, 'Архив')
      .query('UPDATE Teams SET Status = @Status WHERE ID_Team = @ID_Team');

    res.status(200).json({ message: 'Команда, проекты и задачи успешно архивированы' });
  } catch (error) {
    console.error('Ошибка при архивации команды и связанных элементов:', error);
    res.status(500).json({ message: 'Ошибка при архивации команды и связанных элементов' });
  }
};

module.exports = {
  getAllTeams,
  createTeam,
  updateTeamName,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
  archiveTeam,
  restoreTeam,
};
