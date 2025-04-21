const express = require('express');
const router = express.Router();
const { getAllTeams, createTeam } = require('../controllers/team.controller');

router.get('/', getAllTeams);
router.post('/', createTeam); // ← Обязательно должен быть

module.exports = router;
