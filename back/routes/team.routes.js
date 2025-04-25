const express = require('express');
const router = express.Router();
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

// ✅ Путь должен быть с `/teams` (не `/team`)
router.delete('/:teamId/remove/:memberId', removeTeamMember);
router.delete('/:teamId', deleteTeam);

module.exports = router;
