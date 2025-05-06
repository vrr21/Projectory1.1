const { sql, poolConnect, pool } = require('../config/db');

const getNotifications = async (req, res) => {
  try {
    await poolConnect;
    const email = req.query.employeeEmail;

    if (!email) {
      return res.status(400).json({ message: 'Email обязателен' });
    }

    const request = pool.request().input('Email', sql.NVarChar, email);

    const result = await request.query(`
      SELECT ID_Notification AS id, Title AS title, Description AS description, 
             FORMAT(Created_At, 'dd.MM.yyyy HH:mm') AS datetime
      FROM Notifications
      WHERE UserEmail = @Email
      ORDER BY Created_At DESC
    `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении уведомлений:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении уведомлений' });
  }
};

module.exports = { getNotifications };
