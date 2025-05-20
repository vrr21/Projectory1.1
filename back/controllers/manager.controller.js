const { poolConnect, pool, sql } = require('../config/db');

exports.updateManager = async (req, res) => {
  const { id, firstName, lastName, phone } = req.body;

  if (!id || !firstName || !lastName || !phone) {
    return res.status(400).json({ message: 'Некорректные данные' });
  }

  try {
    await poolConnect;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('phone', sql.NVarChar, phone)
      .query(`
        UPDATE Users
        SET First_Name = @firstName,
            Last_Name = @lastName,
            Phone = @phone
        WHERE ID_User = @id AND ID_Role = (SELECT ID_Role FROM Roles WHERE Role_Name = 'Менеджер')
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Менеджер не найден' });
    }

    res.json({ message: 'Данные успешно обновлены' });
  } catch (error) {
    console.error('Ошибка при обновлении данных менеджера:', error);
    res.status(500).json({ message: 'Ошибка при обновлении данных' });
  }
};
