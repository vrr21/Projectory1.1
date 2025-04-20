// back/controllers/employee.controller.js

const db = require('../config/db');

// Получить всех сотрудников
exports.getAllEmployees = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Users WHERE ID_Role != 1'); // Получаем всех сотрудников, исключая менеджеров
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка при получении сотрудников:', err);
    res.status(500).json({ message: 'Ошибка при получении сотрудников' });
  }
};
