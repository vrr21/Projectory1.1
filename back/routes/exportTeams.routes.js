// back\routes\exportTeams.routes.js
const express = require('express');
const router = express.Router();
const exportTeamsController = require('../controllers/exportTeams.controller');

router.post('/', exportTeamsController.exportTeams);
router.post('/teams/custom', exportTeamsController.exportTeams);
router.get('/', exportTeamsController.exportTeams);


module.exports = router;
