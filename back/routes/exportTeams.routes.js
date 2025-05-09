const express = require('express');
const router = express.Router();
const exportTeamsController = require('../controllers/exportTeams.controller');

router.get('/teams', exportTeamsController.exportTeams);

module.exports = router;
