const express = require('express');
const router = express.Router();
const { poolConnect, pool, sql } = require('../config/db');

// Получить всех сотрудников
router.get('/', async (req, res) => {
  try {
    await poolConnect; // ✅
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

// Поиск сотрудников
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    await poolConnect; // ✅
    const result = await pool.request()
      .input('query', sql.NVarChar, `%${q}%`)
      .query(`
        SELECT ID_User AS id, First_Name + ' ' + Last_Name AS fullName
        FROM Users
        WHERE First_Name LIKE @query OR Last_Name LIKE @query OR Email LIKE @query
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка поиска сотрудников:', error);
    res.status(500).json({ message: 'Ошибка поиска сотрудников' });
  }
});

module.exports = router;
