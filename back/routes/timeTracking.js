const express = require('express');
const { pool, sql } = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Получить все записи учета времени по текущему сотруднику
router.get('/time-tracking', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const result = await pool.request()
      .input('ID_Employee', sql.Int, userId)
      .query(`
        SELECT 
          e.ID_Execution,
          e.ID_Task,
          t.Task_Name,
          t.Description,
          t.Deadline,
          o.Order_Name,
          e.Start_Date,
          e.End_Date,
          DATEDIFF(HOUR, e.Start_Date, ISNULL(e.End_Date, GETDATE())) AS Hours_Spent
        FROM Execution e
        INNER JOIN Tasks t ON e.ID_Task = t.ID_Task
        INNER JOIN Orders o ON t.ID_Order = o.ID_Order
        WHERE e.ID_Employee = @ID_Employee
        ORDER BY e.Start_Date DESC
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении записей времени:', error);
    res.status(500).json({ message: 'Ошибка при загрузке учета времени' });
  }
});

// Добавить запись учета времени
router.post('/time-tracking', verifyToken, async (req, res) => {
  const { taskName, date } = req.body;

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const request = pool.request();
    request.input('ID_Task', sql.Int, taskName);
    request.input('ID_Employee', sql.Int, userId);
    request.input('Start_Date', sql.DateTime, date);
    request.input('End_Date', sql.DateTime, date);

    await request.query(`
      INSERT INTO Execution (ID_Task, ID_Employee, Start_Date, End_Date)
      VALUES (@ID_Task, @ID_Employee, @Start_Date, @End_Date)
    `);

    res.status(201).json({ message: 'Запись времени добавлена' });
  } catch (error) {
    console.error('Ошибка при добавлении учета времени:', error);
    res.status(500).json({ message: 'Ошибка при добавлении' });
  }
});

module.exports = router;
