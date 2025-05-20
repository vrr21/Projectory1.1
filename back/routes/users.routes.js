const express = require('express');
const router = express.Router();
const { pool, sql, poolConnect } = require('../config/db');

// 📌 Обновить пользователя (редактировать)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { First_Name, Last_Name, Email, Phone, Password } = req.body;

  try {
    await poolConnect;
    const request = pool.request()
      .input('id', sql.Int, id)
      .input('firstName', sql.NVarChar, First_Name)
      .input('lastName', sql.NVarChar, Last_Name)
      .input('email', sql.NVarChar, Email)
      .input('phone', sql.NVarChar, Phone);

    if (Password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(Password, 10);
      request.input('password', sql.NVarChar, hashedPassword);
      await request.query(`
        UPDATE Users
        SET First_Name = @firstName,
            Last_Name = @lastName,
            Email = @email,
            Phone = @phone,
            Password = @password
        WHERE ID_User = @id
      `);
    } else {
      await request.query(`
        UPDATE Users
        SET First_Name = @firstName,
            Last_Name = @lastName,
            Email = @email,
            Phone = @phone
        WHERE ID_User = @id
      `);
    }

    res.json({ message: 'Пользователь обновлён' });
  } catch (err) {
    console.error('Ошибка обновления:', err);
    res.status(500).json({ message: 'Ошибка обновления' });
  }
});

// 📌 Архивация
router.patch("/:id/archive", async (req, res) => {
    const { id } = req.params;
    const { Archived } = req.body;
  
    try {
      await poolConnect;
      await pool.request()
        .input("Archived", sql.Bit, Archived)
        .input("ID_User", sql.Int, id)
        .query(`UPDATE Users SET Archived = @Archived WHERE ID_User = @ID_User`);
  
      res.status(200).json({ message: "Сотрудник архивирован" });
    } catch (err) {
      console.error("Ошибка при архивировании:", err);
      res.status(500).json({ message: "Ошибка при архивировании" });
    }
  });

// 📌 Удаление
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Users WHERE ID_User = @id');

    res.json({ message: 'Пользователь удалён' });
  } catch (err) {
    console.error('Ошибка удаления:', err);
    res.status(500).json({ message: 'Ошибка удаления' });
  }
});

module.exports = router;
