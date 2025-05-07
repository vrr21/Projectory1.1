const { sql, poolConnect } = require('../config/db');

const getOrdersStats = async (req, res) => {
  try {
    const pool = await poolConnect;
    const result = await pool.request().query(`
      SELECT 
        Creation_Date, 
        COUNT(ID_Task) AS Total_Tasks 
      FROM Tasks 
      INNER JOIN Orders ON Tasks.ID_Order = Orders.ID_Order 
      GROUP BY Creation_Date
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении статистики заказов:', error);
    res.status(500).json({ error: 'Ошибка при загрузке статистики заказов' });
  }
};

const getEmployeeHours = async (req, res) => {
  try {
    const pool = await poolConnect;
    const result = await pool.request().query('SELECT * FROM EmployeeHoursReport');
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении часов сотрудников:', error);
    res.status(500).json({ error: 'Ошибка при загрузке часов сотрудников' });
  }
};

const getTaskStatusSummary = async (req, res) => {
  try {
    const pool = await poolConnect;
    const result = await pool.request().query('SELECT * FROM TaskStatusSummary');
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении TaskStatusSummary:', error);
    res.status(500).json({ error: 'Ошибка при загрузке статистики статусов' });
  }
};

module.exports = {
  getOrdersStats,
  getEmployeeHours,
  getTaskStatusSummary,
};
