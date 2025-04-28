const express = require('express');
const router = express.Router();
const { poolConnect, pool, sql } = require('../config/db');

const {
  getAllTeams,
  createTeam,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
} = require('../controllers/team.controller');

router.get('/', getAllTeams);
router.post('/', createTeam);
router.post('/add', addTeamMember);
router.delete('/:teamId/remove/:memberId', removeTeamMember);
router.delete('/:teamId', deleteTeam);

// Поиск команд
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    await poolConnect; // ✅ Используем готовое подключение
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
