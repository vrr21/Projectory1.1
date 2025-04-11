// routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolConnect, pool } = require('../config/db');

const router = express.Router();

// Регистрация
router.post('/register', async (req, res) => {
  const { firstName, lastName, phone, email, password, role } = req.body;

  if (!firstName || !lastName || !phone || !email || !password || !role) {
    return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
  }

  try {
    await poolConnect;

    // Проверка существующего пользователя
    const checkUserRequest = pool.request();
    const checkUser = await checkUserRequest
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }

    // Получение ID роли
    const roleRequest = pool.request();
    const roleResult = await roleRequest
      .input('roleName', sql.NVarChar, role)
      .query('SELECT ID_Role FROM Roles WHERE Role_Name = @roleName');

    if (roleResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Роль не найдена' });
    }

    const roleId = roleResult.recordset[0].ID_Role;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Вставка нового пользователя
    const insertRequest = pool.request();
    await insertRequest
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('phone', sql.NVarChar, phone)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashedPassword)
      .input('roleId', sql.Int, roleId)
      .query(`
        INSERT INTO Users (First_Name, Last_Name, Phone, Email, Password, ID_Role)
        VALUES (@firstName, @lastName, @phone, @email, @password, @roleId)
      `);

    res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Авторизация
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email и пароль обязательны' });
  }

  try {
    await poolConnect;
    const request = pool.request();

    const userResult = await request
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    if (userResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    const user = userResult.recordset[0];
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    const roleRequest = pool.request();
    const roleResult = await roleRequest
      .input('roleId', sql.Int, user.ID_Role)
      .query('SELECT Role_Name FROM Roles WHERE ID_Role = @roleId');

    const roleName = roleResult.recordset[0].Role_Name;

    const token = jwt.sign(
      { id: user.ID_User, email: user.Email, role: roleName },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.ID_User,
        email: user.Email,
        role: roleName,
        name: `${user.First_Name} ${user.Last_Name}`,
      },
    });
  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
