const express = require('express');
const router = express.Router();
const exportProjectsController = require('../controllers/exportProjects.controller');

router.get('/projects', exportProjectsController.exportReportsHandler);

module.exports = router;
