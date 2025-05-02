const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool, sql, poolConnect } = require('../config/db');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `task-${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

router.post('/upload-task', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });

    const { taskId } = req.body;
    const filename = req.file.filename;

    if (!taskId) {
      return res.status(400).json({ message: 'Не передан ID задачи' });
    }

    await poolConnect;
    await pool.request()
      .input('ID_Task', sql.Int, taskId)
      .input('Attachments', sql.NVarChar, filename)
      .query(`
        UPDATE Tasks
        SET Attachments = @Attachments
        WHERE ID_Task = @ID_Task
      `);

    res.status(200).json({ message: 'Файл прикреплён к задаче', filename });
  } catch (error) {
    console.error('Ошибка при загрузке файла к задаче:', error);
    res.status(500).json({ message: 'Ошибка при прикреплении файла', error: error.message });
  }
});

module.exports = router;
