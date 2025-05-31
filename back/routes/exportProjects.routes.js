const express = require('express');
const router = express.Router();
const exportProjectsController = require('../controllers/exportProjects.controller');

router.post('/', exportProjectsController.exportReportsHandler);

module.exports = router;
