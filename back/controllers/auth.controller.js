const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sql, poolConnect, pool } = require('../config/db');

const router = express.Router();

// ⚙️ Настройка multer для загрузки аватаров
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// 📤 Загрузка аватара
router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Нет токена' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    await poolConnect;
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('avatar', sql.NVarChar, req.file.filename)
      .query('UPDATE Users SET Avatar = @avatar WHERE ID_User = @userId');

    res.json({ filename: req.file.filename });
  } catch (error) {
    console.error('Ошибка при загрузке аватара:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// ✅ Регистрация
router.post('/register', async (req, res) => {
  const { firstName, lastName, phone, email, password } = req.body;

  if (!firstName || !lastName || !phone || !email || !password) {
    return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
  }

  try {
    await poolConnect;

    const checkUser = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }

    const roleResult = await pool.request()
      .input('roleName', sql.NVarChar, 'Сотрудник')
      .query('SELECT ID_Role FROM Roles WHERE Role_Name = @roleName');

    if (roleResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Роль "Сотрудник" не найдена' });
    }

    const roleId = roleResult.recordset[0].ID_Role;
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.request()
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('phone', sql.NVarChar, phone)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashedPassword)
      .input('roleId', sql.Int, roleId)
      .query(`INSERT INTO Users (First_Name, Last_Name, Phone, Email, Password, ID_Role)
              VALUES (@firstName, @lastName, @phone, @email, @password, @roleId)`);

    res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});


// 🔐 Авторизация
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email и пароль обязательны' });
  }

  try {
    await poolConnect;

    const userResult = await pool.request()
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

    const roleResult = await pool.request()
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
        ID_User: user.ID_User,
        Email: user.Email,
        Role: roleName,
        Name: `${user.Last_Name} ${user.First_Name}`,
        First_Name: user.First_Name,
        Last_Name: user.Last_Name,
        Phone: user.Phone,
        Avatar: user.Avatar ?? null
      }
    });
  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
