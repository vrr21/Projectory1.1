// back/controllers/notificationController.js
const { sql, poolConnect, pool } = require('../config/db');

// 🔹 Получить уведомления по email
const getNotifications = async (req, res) => {
  try {
    await poolConnect;
    const email = req.query.employeeEmail;

    if (!email) {
      return res.status(400).json({ message: 'Email обязателен' });
    }

    const result = await pool.request()
      .input('Email', sql.NVarChar, email)
      .query(`
        SELECT 
          ID_Notification AS id, 
          Title AS title, 
          Description AS description, 
          Created_At
        FROM Notifications
        WHERE UserEmail = @Email
        ORDER BY Created_At DESC
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('❌ Ошибка при получении уведомлений:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении уведомлений' });
  }
};

// 🔹 Удалить уведомление по ID
const deleteNotificationById = async (req, res) => {
  try {
    await poolConnect;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'Неверный ID уведомления' });
    }

    const result = await pool
      .request()
      .input('ID', sql.Int, id)
      .query('DELETE FROM Notifications WHERE ID_Notification = @ID');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Уведомление не найдено' });
    }

    res.status(200).json({ message: 'Уведомление успешно удалено' });
  } catch (error) {
    console.error('❌ Ошибка при удалении уведомления:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении уведомления' });
  }
};

module.exports = {
  getNotifications,
  deleteNotificationById,
};
