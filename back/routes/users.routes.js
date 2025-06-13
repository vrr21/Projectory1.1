const express = require('express');
const router = express.Router();
const { pool, sql, poolConnect } = require('../config/db');
const bcrypt = require('bcryptjs');

// 📌 СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ
router.post('/', async (req, res) => {
  const { First_Name, Last_Name, Email, Phone, Password } = req.body;

  if (!First_Name || !Last_Name || !Email || !Phone || !Password) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }

  try {
    await poolConnect;

    const existing = await pool.request()
      .input('Email', sql.NVarChar, Email)
      .query('SELECT * FROM Users WHERE Email = @Email');

    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    const roleResult = await pool.request()
      .input('RoleName', sql.NVarChar, 'Сотрудник')
      .query('SELECT ID_Role FROM Roles WHERE Role_Name = @RoleName');

    const roleId = roleResult.recordset[0]?.ID_Role;
    if (!roleId) {
      return res.status(400).json({ message: 'Роль "Сотрудник" не найдена' });
    }

    await pool.request()
      .input('First_Name', sql.NVarChar, First_Name)
      .input('Last_Name', sql.NVarChar, Last_Name)
      .input('Email', sql.NVarChar, Email)
      .input('Phone', sql.NVarChar, Phone)
      .input('Password', sql.NVarChar, hashedPassword)
      .input('ID_Role', sql.Int, roleId)
      .query(`
        INSERT INTO Users (First_Name, Last_Name, Email, Phone, Password, ID_Role)
        VALUES (@First_Name, @Last_Name, @Email, @Phone, @Password, @ID_Role)
      `);

    res.status(201).json({ message: 'Пользователь создан' });
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// 📌 ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ (включая роль)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { First_Name, Last_Name, Email, Phone, Password, ID_Role } = req.body;

  if (!First_Name || !Last_Name || !Email || ID_Role === undefined) {
    return res.status(400).json({ message: 'Некорректные данные' });
  }

  try {
    await poolConnect;

    const request = pool.request()
      .input('ID_User', sql.Int, id)
      .input('First_Name', sql.NVarChar, First_Name)
      .input('Last_Name', sql.NVarChar, Last_Name)
      .input('Email', sql.NVarChar, Email)
      .input('Phone', sql.NVarChar, Phone)
      .input('ID_Role', sql.Int, ID_Role);

    if (Password) {
      const hashedPassword = await bcrypt.hash(Password, 10);
      request.input('Password', sql.NVarChar, hashedPassword);
    }

    const updateQuery = `
      UPDATE Users
      SET First_Name = @First_Name,
          Last_Name = @Last_Name,
          Email = @Email,
          Phone = @Phone
          ${Password ? ', Password = @Password' : ''}
          , ID_Role = @ID_Role
      WHERE ID_User = @ID_User
    `;

    await request.query(updateQuery);

    // 🔥 Если пользователь становится менеджером — удаляем его из команд
    if (ID_Role === 1) {
      await pool.request()
        .input('ID_User', sql.Int, id)
        .query('DELETE FROM TeamMembers WHERE ID_User = @ID_User');
    }

    res.json({ message: 'Пользователь обновлён' });
  } catch (err) {
    console.error('Ошибка обновления:', err);
    res.status(500).json({ message: 'Ошибка обновления' });
  }
});

// 📌 АРХИВАЦИЯ ПОЛЬЗОВАТЕЛЯ
router.patch('/:id/archive', async (req, res) => {
  const { id } = req.params;
  const { Archived } = req.body;

  try {
    await poolConnect;
    await pool.request()
      .input('Archived', sql.Bit, Archived)
      .input('ID_User', sql.Int, id)
      .query(`UPDATE Users SET Archived = @Archived WHERE ID_User = @ID_User`);

    res.status(200).json({ message: Archived ? 'Сотрудник архивирован' : 'Сотрудник восстановлен' });
  } catch (err) {
    console.error('Ошибка при архивировании:', err);
    res.status(500).json({ message: 'Ошибка при архивировании' });
  }
});

// 📌 УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    // Удаляем зависимости
    await pool.request().input('ID_User', sql.Int, id).query('DELETE FROM TeamMembers WHERE ID_User = @ID_User');
    await pool.request().input('ID_User', sql.Int, id).query('DELETE FROM Assignment WHERE ID_Employee = @ID_User');

    // Удаляем самого пользователя
    await pool.request()
      .input('ID_User', sql.Int, id)
      .query('DELETE FROM Users WHERE ID_User = @ID_User');

    res.json({ message: 'Пользователь удалён' });
  } catch (err) {
    console.error('Ошибка удаления:', err);
    res.status(500).json({ message: 'Ошибка удаления' });
  }
});

module.exports = router;
