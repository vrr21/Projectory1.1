const express = require('express');
const router = express.Router();
const { poolConnect, pool, sql } = require('../config/db');

const {
  getAllTeams,
  createTeam,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
  archiveTeam,
  restoreTeam
} = require('../controllers/team.controller');

// Получение всех команд
router.get('/', getAllTeams);

// Создание новой команды
router.post('/', createTeam);

// Добавление участника в команду
router.post('/add', addTeamMember);

// Удаление участника из команды
router.delete('/:teamId/remove/:memberId', removeTeamMember);

// Полное удаление команды
router.delete('/:teamId', deleteTeam);

// ✅ Архивация команды (обновление статуса на "Архив")
router.patch('/:teamId/archive', archiveTeam);

// ✅ Восстановление команды (обновление статуса на "В процессе")
router.patch('/:teamId/restore', restoreTeam);

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
