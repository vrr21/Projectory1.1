const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportProjectsTeamsEmployee.controller');

router.post('/', exportController.exportProjectsTeamsEmployeeHandler);

module.exports = router;
