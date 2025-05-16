const express = require('express');
const router = express.Router();
const { poolConnect, pool, sql } = require('../config/db');

const {
  getAllTeams,
  createTeam,
  createTeamWithMembers,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
  archiveTeam,
  restoreTeam,
  updateTeamName,
  archiveTeamWithProjectsAndTasks,
} = require('../controllers/team.controller');

// Получение всех команд
router.get('/', getAllTeams);

// Создание команды без участников
router.post('/', createTeam);

// Создание команды с участниками
router.post('/with-members', createTeamWithMembers);

// Добавление участника в команду
router.post('/add', addTeamMember);

// Удаление участника из команды
router.delete('/:teamId/remove/:memberId', removeTeamMember);

// Полное удаление команды
router.delete('/:teamId', deleteTeam);

// Обновление названия команды
router.patch('/:teamId', updateTeamName);

// Архивация команды
router.patch('/:teamId/archive', archiveTeam);

// Восстановление команды
router.patch('/:teamId/restore', restoreTeam);

// Архивация команды с закрытием проектов и завершением задач
router.patch('/:teamId/archive-with-projects-and-tasks', archiveTeamWithProjectsAndTasks);

// Поиск команд по названию
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
