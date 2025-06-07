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
        Link,            -- 🟢 добавляем Link
        Created_At,
        Is_Read AS isRead
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

// 🔹 Создать уведомление
// 🔹 Создать уведомление
const createNotification = async (req, res) => {
  try {
    await poolConnect;
    const { userEmail, title, description, link } = req.body;

    if (!userEmail || !title || !description) {
      return res.status(400).json({ message: "Необходимы все поля: userEmail, title, description" });
    }

    await pool.request()
      .input('UserEmail', sql.NVarChar, userEmail)
      .input('Title', sql.NVarChar, title)
      .input('Description', sql.NVarChar, description)
      .input('Link', sql.NVarChar, link || null)
      .query(`
        INSERT INTO Notifications (UserEmail, Title, Description, Link, Created_At)
        VALUES (@UserEmail, @Title, @Description, @Link, GETDATE())
      `);

    res.status(201).json({ message: "Уведомление успешно создано" });
  } catch (error) {
    console.error("❌ Ошибка при создании уведомления:", error);
    res.status(500).json({ message: "Ошибка сервера при создании уведомления" });
  }
};


// 🔹 Пометить уведомление как прочитанное
const markNotificationAsRead = async (req, res) => {
  try {
    await poolConnect;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'Неверный ID уведомления' });
    }

    await pool
      .request()
      .input('ID', sql.Int, id)
      .query(`
        UPDATE Notifications
        SET Is_Read = 1
        WHERE ID_Notification = @ID
      `);

    res.status(200).json({ message: 'Уведомление отмечено как прочитанное' });
  } catch (error) {
    console.error('❌ Ошибка при отметке уведомления как прочитанного:', error);
    res.status(500).json({ message: 'Ошибка сервера при отметке уведомления' });
  }
};
const getManagerNotifications = async (req, res) => {
  try {
    await poolConnect;
    const email = req.query.managerEmail;

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
        Link,
        Created_At,
        Is_Read AS isRead
      FROM Notifications
      WHERE UserEmail = @Email
      ORDER BY Created_At DESC
    `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('❌ Ошибка при получении уведомлений для менеджера:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении уведомлений' });
  }
};

module.exports = {
  getNotifications,
  getManagerNotifications, 
  deleteNotificationById,
  createNotification,
  markNotificationAsRead
};