const { pool } = require('../config/db');

// 🔹 Получение всех статусов задач
exports.getAllStatuses = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT ID_Status, Status_Name FROM Statuses
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении статусов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
