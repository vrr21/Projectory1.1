const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sql, poolConnect, pool } = require('../config/db');

const router = express.Router();

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// Маршрут для загрузки аватара
router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.body.userId;
    const filename = req.file.filename;

    await poolConnect;

    // Обновление информации об аватаре пользователя в базе данных
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('avatar', sql.NVarChar, filename)
      .query('UPDATE Users SET Avatar = @avatar WHERE ID_User = @userId');

    res.json({ filename });
  } catch (error) {
    console.error('Ошибка при загрузке аватара:', error);
    res.status(500).json({ message: 'Ошибка при загрузке аватара' });
  }
});

module.exports = router;
