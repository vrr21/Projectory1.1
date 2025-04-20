// tasks.routes.js
const express = require('express');
const { pool, sql } = require('../config/db');
const router = express.Router();

// Получение всех задач
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await pool.request().query('SELECT * FROM Tasks');
    res.json(tasks.recordset);
  } catch (error) {
    console.error('Ошибка при получении задач:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Добавление новой задачи
router.post('/tasks', async (req, res) => {
  const { Task_Name, Description, Time_Norm, ID_Status } = req.body;
  try {
    await pool.request()
      .input('Task_Name', sql.NVarChar, Task_Name)
      .input('Description', sql.NVarChar, Description)
      .input('Time_Norm', sql.Int, Time_Norm)
      .input('ID_Status', sql.Int, ID_Status)
      .query(`
        INSERT INTO Tasks (Task_Name, Description, Time_Norm, ID_Status)
        VALUES (@Task_Name, @Description, @Time_Norm, @ID_Status)
      `);
    res.status(201).json({ message: 'Задача создана' });
  } catch (error) {
    console.error('Ошибка при добавлении задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
