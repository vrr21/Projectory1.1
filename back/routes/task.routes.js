// routes/tasks.routes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Подключение к вашей БД

// Получение всех задач
router.get('/tasks', async (req, res) => {
  const tasks = await db.query('SELECT * FROM Tasks');
  res.json(tasks.recordset);
});

// Обновление статуса задачи
router.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  await db.query(
    'UPDATE Tasks SET Status = @status WHERE ID_Task = @id',
    {
      id,
      status,
    }
  );
  res.sendStatus(200);
});

module.exports = router;
