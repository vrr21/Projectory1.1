// back/controllers/employees.controller.js

const { pool, poolConnect, sql } = require('../config/db');

// Получить всех сотрудников (кроме менеджеров)
exports.getAllEmployees = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM Users WHERE ID_Role != 1'); // ID_Role != 1 — исключаем менеджеров
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка при получении сотрудников:', err);
    res.status(500).json({ message: 'Ошибка при получении сотрудников' });
  }
};

// Поиск данных сотрудника (используется в поиске в шапке)
exports.fullSearchEmployeeData = async (req, res) => {
  const { q, employeeEmail } = req.query;

  if (!q || !employeeEmail) {
    return res.status(400).json({ message: 'Параметры поиска обязательны' });
  }

  try {
    await poolConnect;
    const result = await pool.request()
      .input('query', sql.NVarChar(255), `%${q}%`)  // ✅ добавляем ограничение 255
      .input('email', sql.NVarChar(255), employeeEmail)  // ✅ добавляем ограничение 255
      .query(`
        SELECT
          T.ID_Task AS id,
          T.Task_Name AS name,
          'task' AS type
        FROM Tasks T
        JOIN Users U ON T.ID_User = U.ID_User
        WHERE U.Email = @email AND T.Task_Name LIKE @query

        UNION ALL

        SELECT
          P.ID_Project AS id,
          P.Project_Name AS name,
          'order' AS type
        FROM Projects P
        JOIN Users U ON P.ID_User = U.ID_User
        WHERE U.Email = @email AND P.Project_Name LIKE @query

        UNION ALL

        SELECT
          TM.ID_Team AS id,
          TM.Team_Name AS name,
          'team' AS type
        FROM Teams TM
        JOIN TeamMembers TMM ON TM.ID_Team = TMM.ID_Team
        JOIN Users U ON TMM.ID_User = U.ID_User
        WHERE U.Email = @email AND TM.Team_Name LIKE @query
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка поиска данных сотрудника:', error);
    res.status(500).json({ message: 'Ошибка поиска данных сотрудника' });
  }
};
