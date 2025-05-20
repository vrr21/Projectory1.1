const express = require('express');
const router = express.Router();
const managerController = require('../controllers/manager.controller');
const { uploadAvatar } = require('../controllers/uploadAvatar.controller');
const { poolConnect, pool, sql } = require('../config/db');

// ✅ Поиск данных для менеджера
router.get('/fullsearch', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ message: 'Отсутствует параметр поиска' });
  }

  try {
    await poolConnect;
    const searchQuery = `%${q}%`;

    const tasksPromise = pool.request()
      .input('query', sql.NVarChar, searchQuery)
      .query(`
        SELECT 'task' AS type, t.ID_Task AS id, t.Task_Name AS name, t.Description AS extra
        FROM Tasks t
        WHERE t.Task_Name LIKE @query OR t.Description LIKE @query
      `);

    const ordersPromise = pool.request()
      .input('query', sql.NVarChar, searchQuery)
      .query(`
        SELECT 'order' AS type, o.ID_Order AS id, o.Order_Name AS name, o.Status AS extra
        FROM Orders o
        WHERE o.Order_Name LIKE @query
      `);

    const teamsPromise = pool.request()
      .input('query', sql.NVarChar, searchQuery)
      .query(`
        SELECT 'team' AS type, tm.ID_Team AS id, tm.Team_Name AS name, NULL AS extra
        FROM Teams tm
        WHERE tm.Team_Name LIKE @query
      `);

    const [tasks, orders, teams] = await Promise.all([tasksPromise, ordersPromise, teamsPromise]);
    const result = [...tasks.recordset, ...orders.recordset, ...teams.recordset];
    res.json(result);
  } catch (error) {
    console.error('Ошибка поиска данных:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ✅ Обновление данных менеджера
router.put('/update', managerController.updateManager);

// ✅ Загрузка аватара менеджера
router.post('/upload-avatar', uploadAvatar);

module.exports = router;
