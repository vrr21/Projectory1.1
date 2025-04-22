// back/routes/employees.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        ID_User,
        First_Name + ' ' + Last_Name AS FullName 
      FROM Users
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении сотрудников:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
