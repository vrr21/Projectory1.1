const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');

router.get('/members', async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT ID_User as id, FullName as fullName, Email as email FROM Users WHERE Role_ID = 2
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка получения сотрудников:', error);
    res.status(500).json({ error: 'Ошибка при получении сотрудников' });
  }
});

module.exports = router;
