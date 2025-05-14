const { pool, poolConnect } = require('../config/db');

const getAllRoles = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query('SELECT Role_Name FROM Roles');
    const roles = result.recordset
      .map(r => r.Role_Name)
      .filter(name => name && name.trim() !== '');  // Убираем пустые

    res.json(roles);
  } catch (error) {
    console.error('Ошибка получения ролей:', error);
    res.status(500).json({ message: 'Ошибка при получении ролей' });
  }
};

module.exports = { getAllRoles };
