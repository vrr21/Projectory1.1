const { pool, poolConnect } = require('../config/db');

const getAllRoles = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query('SELECT Role_Name FROM Roles');
    res.json(result.recordset.map(r => r.Role_Name));
  } catch (error) {
    console.error('Ошибка получения ролей:', error);
    res.status(500).json({ message: 'Ошибка при получении ролей' });
  }
};

module.exports = { getAllRoles };
