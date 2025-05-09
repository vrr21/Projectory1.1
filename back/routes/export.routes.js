const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');

router.get('/projects', exportController.exportProjects);

module.exports = router;
