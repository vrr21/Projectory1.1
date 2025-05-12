const express = require('express');
const router = express.Router();
const { getAllRoles } = require('../controllers/role.controller');

router.get('/', getAllRoles);

module.exports = router;
