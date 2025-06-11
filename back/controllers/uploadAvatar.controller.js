const path = require('path');
const fs = require('fs');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

exports.uploadAvatar = async (req, res) => {
  console.log("req.body:", req.body);
  console.log("req.file:", req.file);

  const userId = req.body.userId;
  if (!req.file) {
    return res.status(400).json({ message: 'Файл не был загружен' });
  }
  if (!userId) {
    return res.status(400).json({ message: 'ID пользователя не указан' });
  }

  const filename = req.file.filename;

  const { poolConnect, pool, sql } = require('../config/db');
  try {
    await poolConnect;
    await pool.request()
      .input('id', sql.Int, userId)
      .input('avatar', sql.NVarChar, filename)
      .query('UPDATE Users SET Avatar = @avatar WHERE ID_User = @id');

    res.json({ message: 'Аватар обновлён', filename });
  } catch (error) {
    console.error('Ошибка при обновлении аватара:', error);
    res.status(500).json({ message: 'Ошибка обновления аватара' });
  }
};
