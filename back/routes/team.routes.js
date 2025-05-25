const express = require('express');
const router = express.Router();
const { poolConnect, pool, sql } = require('../config/db');

const {
  getAllTeams,
  createTeam,
  createTeamWithMembers,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  deleteTeam,
  archiveTeam,
  restoreTeam,
  updateTeamName,
  archiveTeamWithProjectsAndTasks,
  deleteTeamWithProjectsAndTasks,
  exportCustomTeams,
} = require('../controllers/team.controller');

// ✅ Получение всех команд
router.get('/', getAllTeams);

// ✅ Получение команды по email пользователя
router.get('/by-user', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email обязателен' });
  }

  try {
    await poolConnect;
    const result = await pool.request()
      .input('Email', sql.NVarChar, email)
      .query(`
        SELECT t.ID_Team AS id, t.Team_Name AS name, t.Status,
               u.ID_User AS userId, u.First_Name + ' ' + u.Last_Name AS fullName, u.Email,
               tm.Role
        FROM Teams t
        LEFT JOIN TeamMembers tm ON t.ID_Team = tm.ID_Team
        LEFT JOIN Users u ON tm.ID_User = u.ID_User
        WHERE u.Email = @Email
      `);

    const teams = result.recordset.reduce((acc, row) => {
      let team = acc.find(t => t.id === row.id);
      if (!team) {
        team = {
          id: row.id,
          name: row.name,
          status: row.Status,
          members: []
        };
        acc.push(team);
      }
      if (row.userId) {
        team.members.push({
          userId: row.userId,
          fullName: row.fullName,
          email: row.Email,
          role: row.Role || ''
        });
      }
      return acc;
    }, []);

    res.json(teams);
  } catch (error) {
    console.error('Ошибка при получении команд пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ✅ Создание команды без участников
router.post('/', createTeam);

// ✅ Создание команды с участниками
router.post('/with-members', createTeamWithMembers);

// ✅ Добавление участника в команду
router.post('/add', addTeamMember);

// ✅ Удаление участника из команды
router.delete('/:teamId/remove/:memberId', removeTeamMember);

// ✅ Обновление роли участника в команде
router.patch('/:teamId/members/:memberId', updateMemberRole);

// ✅ Полное удаление команды
router.delete('/:teamId', deleteTeam);

// ✅ Полное удаление команды с заказами и задачами
router.delete('/:teamId/full', deleteTeamWithProjectsAndTasks);

// ✅ Обновление названия команды
router.patch('/:teamId', updateTeamName);

// ✅ Архивация команды
router.patch('/:teamId/archive', archiveTeam);

// ✅ Архивация команды с закрытием проектов и завершением задач
router.patch('/:teamId/archive-with-projects-and-tasks', archiveTeamWithProjectsAndTasks);

// ✅ Восстановление команды
router.patch('/:teamId/restore', restoreTeam);

// ✅ Экспорт команд
router.post('/export', exportCustomTeams);

// ✅ Поиск команд по названию
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    await poolConnect;
    const result = await pool.request()
      .input('query', sql.NVarChar, `%${q}%`)
      .query(`
        SELECT ID_Team, Team_Name
        FROM Teams
        WHERE Team_Name LIKE @query
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка поиска команд:', error);
    res.status(500).json({ message: 'Ошибка поиска команд' });
  }
});

module.exports = router;
