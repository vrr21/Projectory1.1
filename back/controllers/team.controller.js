const { pool, poolConnect } = require('../config/db');
const sql = require('mssql');
const excelJS = require('exceljs');
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
          ID_User: row.userId,
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

    // 🔥 Обновляем роль в Users
await pool.request()
.input('ID_User', userId)
.input('Role_Name', sql.NVarChar, role)
.query(`
  UPDATE Users
  SET ID_Role = (
    SELECT TOP 1 ID_Role
    FROM Roles
    WHERE Role_Name = @Role_Name
  )
  WHERE ID_User = @ID_User
`);


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

const deleteTeam = async (req, res) => {
  try {
    await poolConnect;
    const { teamId } = req.params;

    // Удаление назначений Assignment
    await pool.request()
      .input('ID_Team', sql.Int, teamId)
      .query(`
        DELETE FROM Assignment 
        WHERE ID_Task IN (
          SELECT ID_Task FROM Tasks 
          WHERE ID_Order IN (SELECT ID_Order FROM Orders WHERE ID_Team = @ID_Team)
        );
      `);

    // Удаление исполнений Execution
    await pool.request()
      .input('ID_Team', sql.Int, teamId)
      .query(`
        DELETE FROM Execution 
        WHERE ID_Task IN (
          SELECT ID_Task FROM Tasks 
          WHERE ID_Order IN (SELECT ID_Order FROM Orders WHERE ID_Team = @ID_Team)
        );
      `);

    // Удаление задач Tasks
    await pool.request()
      .input('ID_Team', sql.Int, teamId)
      .query(`
        DELETE FROM Tasks 
        WHERE ID_Order IN (SELECT ID_Order FROM Orders WHERE ID_Team = @ID_Team);
      `);

    // Удаление заказов Orders
    await pool.request()
      .input('ID_Team', sql.Int, teamId)
      .query('DELETE FROM Orders WHERE ID_Team = @ID_Team;');

    // Удаление участников TeamMembers
    await pool.request()
      .input('ID_Team', sql.Int, teamId)
      .query('DELETE FROM TeamMembers WHERE ID_Team = @ID_Team;');

    // Удаление самой команды Teams
    await pool.request()
      .input('ID_Team', sql.Int, teamId)
      .query('DELETE FROM Teams WHERE ID_Team = @ID_Team;');

    res.status(200).json({ message: 'Команда и все связанные данные успешно удалены' });

  } catch (error) {
    console.error('Ошибка при полном удалении команды и связанных данных:', error);
    res.status(500).json({ message: 'Ошибка при полном удалении команды и связанных данных' });
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

// Создание команды с участниками
const createTeamWithMembers = async (req, res) => {
  try {
    await poolConnect;
    const { Team_Name, Members } = req.body;

    if (!Team_Name) {
      return res.status(400).json({ error: 'Название команды обязательно' });
    }

    if (!Members || Members.length < 3) {
      return res.status(400).json({ error: 'Минимум 3 участника обязательно' });
    }

    if (await teamExistsByName(Team_Name)) {
      return res.status(400).json({ error: 'Команда с таким названием уже существует' });
    }

    const result = await pool
      .request()
      .input('Team_Name', sql.NVarChar, Team_Name.trim())
      .query('INSERT INTO Teams (Team_Name, Status) OUTPUT INSERTED.ID_Team VALUES (@Team_Name, \'В процессе\')');

    const teamId = result.recordset[0].ID_Team;

    for (const member of Members) {
      const userResult = await pool
        .request()
        .input('ID_User', sql.Int, member.userId)
        .query('SELECT ID_User FROM Users WHERE ID_User = @ID_User');

      if (userResult.recordset.length === 0) {
        return res.status(400).json({ error: `Пользователь с ID ${member.userId} не найден` });
      }

      await pool
        .request()
        .input('ID_User', sql.Int, member.userId)
        .input('ID_Team', sql.Int, teamId)
        .input('Role', sql.NVarChar, member.role)
        .query('INSERT INTO TeamMembers (ID_User, ID_Team, Role) VALUES (@ID_User, @ID_Team, @Role)');
    }

    res.status(201).json({ message: 'Команда и участники успешно созданы', teamId });
  } catch (error) {
    console.error('Ошибка при создании команды с участниками:', error);
    res.status(500).json({ error: 'Ошибка при создании команды с участниками' });
  }
};


const archiveTeamWithProjectsAndTasks = async (req, res) => {
  await poolConnect;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    const { teamId } = req.params;

    // Новый запрос для закрытия заказов
    const request1 = new sql.Request(transaction);
    await request1
      .input('ID_Team', sql.Int, teamId)
      .input('OrderStatus', sql.NVarChar, 'Закрыт')
      .query('UPDATE Orders SET Status = @OrderStatus WHERE ID_Team = @ID_Team');

    // Новый запрос для завершения задач
    const request2 = new sql.Request(transaction);
    await request2
      .input('ID_Team', sql.Int, teamId)
      .input('TaskStatus', sql.NVarChar, 'Завершена')
      .query(`
        UPDATE Tasks
        SET ID_Status = (SELECT TOP 1 ID_Status FROM Statuses WHERE Status_Name = @TaskStatus)
        WHERE ID_Order IN (SELECT ID_Order FROM Orders WHERE ID_Team = @ID_Team)
      `);

    // Новый запрос для архивации команды
    const request3 = new sql.Request(transaction);
    await request3
      .input('ID_Team', sql.Int, teamId)
      .input('Status', sql.NVarChar, 'Архив')
      .query('UPDATE Teams SET Status = @Status WHERE ID_Team = @ID_Team');

    await transaction.commit();

    res.status(200).json({ message: 'Команда, заказы и задачи успешно архивированы' });

  } catch (err) {
    await transaction.rollback();
    console.error('Ошибка при архивировании команды и связанных данных:', err);
    res.status(500).json({
      message: 'Ошибка при архивировании команды и связанных данных.',
      error: err.message,
      stack: err.stack,
    });
  }
};


// Полное удаление команды вместе с проектами и задачами
const deleteTeamWithProjectsAndTasks = async (req, res) => {
  try {
    await poolConnect;
    const { teamId } = req.params;

    // Завершить задачи
    await pool.request()
      .input('ID_Team', sql.Int, teamId)
      .input('TaskStatus', sql.NVarChar, 'Завершена')
      .query(`
        UPDATE Tasks
        SET ID_Status = (SELECT TOP 1 ID_Status FROM Statuses WHERE Status_Name = @TaskStatus)
        WHERE ID_Order IN (SELECT ID_Order FROM Orders WHERE ID_Team = @ID_Team)
      `);

    // Закрыть заказы (Orders)
    await pool.request()
      .input('ID_Team', sql.Int, teamId)
      .input('OrderStatus', sql.NVarChar, 'Закрыт')
      .query(`
        UPDATE Orders
        SET Status = @OrderStatus
        WHERE ID_Team = @ID_Team
      `);

    // Удалить участников
    await pool.request()
      .input('ID_Team', sql.Int, teamId)
      .query('DELETE FROM TeamMembers WHERE ID_Team = @ID_Team');

    // Удалить команду
    await pool.request()
      .input('ID_Team', sql.Int, teamId)
      .query('DELETE FROM Teams WHERE ID_Team = @ID_Team');

    res.status(200).json({ message: 'Команда, её заказы и задачи успешно удалены' });
  } catch (error) {
    console.error('Ошибка при полном удалении команды и связанных данных:', error);
    res.status(500).json({ message: 'Ошибка при полном удалении команды и связанных данных' });
  }
};

// Обновление роли участника команды
const updateMemberRole = async (req, res) => {
  try {
    await poolConnect;
    const { teamId, memberId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Роль обязательна' });
    }

    // 1️⃣ Обновляем роль в TeamMembers
    const result = await pool.request()
      .input('ID_Team', sql.Int, teamId)
      .input('ID_User', sql.Int, memberId)
      .input('Role', sql.NVarChar, role)
      .query(`
        UPDATE TeamMembers
        SET Role = @Role
        WHERE ID_Team = @ID_Team AND ID_User = @ID_User
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Участник не найден в команде' });
    }

    // 2️⃣ Также обновляем роль в таблице Users
    await pool.request()
      .input('ID_User', sql.Int, memberId)
      .input('Role_Name', sql.NVarChar, role)
      .query(`
        UPDATE Users
        SET ID_Role = (
          SELECT TOP 1 ID_Role
          FROM Roles
          WHERE Role_Name = @Role_Name
        )
        WHERE ID_User = @ID_User
      `);

    res.status(200).json({ message: 'Роль обновлена' });
  } catch (error) {
    console.error('Ошибка при обновлении роли участника:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении роли' });
  }
};



const exportCustomTeams = async (req, res) => {
  try {
    const { teams, format, userEmail } = req.body;

    if (!teams || !Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({ error: 'Нет данных для экспорта' });
    }

    if (!userEmail) {
      return res.status(400).json({ error: 'Не указан email пользователя' });
    }

    // Фильтруем команды, в которых состоит текущий пользователь
    const userTeams = teams.filter(team =>
      team.members.some(member => member.email === userEmail)
    );

    if (userTeams.length === 0) {
      return res.status(404).json({ error: 'Нет команд для экспорта' });
    }

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet('Команды');

    worksheet.columns = [
      { header: 'Название команды', key: 'name', width: 30 },
      { header: 'ФИО участника', key: 'fullName', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Роль', key: 'role', width: 20 },
    ];

    userTeams.forEach((team) => {
      team.members.forEach((member) => {
        worksheet.addRow({
          name: team.name,
          fullName: member.fullName,
          email: member.email,
          role: member.role,
        });
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=custom_teams.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Ошибка при экспорте команд:', error);
    res.status(500).json({ error: 'Ошибка при экспорте команд' });
  }
};

const getTeamByUserEmail = async (req, res) => {
  try {
    await poolConnect;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email пользователя обязателен' });
    }

    const result = await pool
      .request()
      .input('Email', sql.NVarChar, email)
      .query(`
        SELECT TOP 1 t.Team_Name, t.ID_Team
        FROM Teams t
        JOIN TeamMembers tm ON t.ID_Team = tm.ID_Team
        JOIN Users u ON tm.ID_User = u.ID_User
        WHERE u.Email = @Email
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Команда не найдена' });
    }

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Ошибка при получении команды по email:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении команды' });
  }
};


module.exports = {
  getAllTeams,
  getTeamByUserEmail, // ✅ ← ДОБАВЬ ЭТО
  createTeam,
  createTeamWithMembers,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  deleteTeam,
  deleteTeamWithProjectsAndTasks,
  archiveTeam,
  restoreTeam,
  updateTeamName,
  archiveTeamWithProjectsAndTasks,
  exportCustomTeams,
};
