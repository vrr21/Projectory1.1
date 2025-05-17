const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Настройка хранения файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Роут для загрузки аватара
router.post('/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Файл не был загружен' });
  }
  res.json({ filename: req.file.filename });
});

module.exports = router;
