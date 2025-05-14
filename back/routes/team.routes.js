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
  restoreTeam,
  updateTeamName, // Новый обработчик
} = require('../controllers/team.controller');

router.get('/', getAllTeams);
router.post('/', createTeam);
router.post('/add', addTeamMember);
router.delete('/:teamId/remove/:memberId', removeTeamMember);
router.delete('/:teamId', deleteTeam);

// Новый роут для редактирования названия
router.patch('/:teamId', updateTeamName);

// Роуты для архивации и восстановления
router.patch('/:teamId/archive', archiveTeam);
router.patch('/:teamId/restore', restoreTeam);

// Поиск команд
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
