const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { poolConnect, pool, sql } = require('../config/db');
const {
  updateEmployeeProfile,
  uploadAvatar,
  getExtendedEmployeeList,
  getAllEmployeesFull,
  getAllEmployeesExtended,
  getEmployeeById,
  getTasksByEmployee // ✅ добавлен импорт
} = require('../controllers/employees.controller');
const { getExtendedEmployees } = require('../controllers/employeesExtended.controller');

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Получить всех сотрудников (кроме менеджеров)
router.get('/', async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT 
        ID_User,
        First_Name,
        Last_Name,
        Email
      FROM Users
      WHERE ID_Role != 1
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении сотрудников:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Поиск сотрудников
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    await poolConnect;
    const result = await pool.request()
      .input('query', sql.NVarChar, `%${q}%`)
      .query(`
        SELECT 
          ID_User AS id,
          First_Name + ' ' + Last_Name AS fullName,
          Email
        FROM Users
        WHERE First_Name LIKE @query OR Last_Name LIKE @query OR Email LIKE @query
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка поиска сотрудников:', error);
    res.status(500).json({ message: 'Ошибка поиска сотрудников' });
  }
});

// Обновление данных профиля сотрудника
router.put('/update', updateEmployeeProfile);

// Загрузка аватара сотрудника
router.post('/upload-avatar', upload.single('avatar'), uploadAvatar);

// Расширенные данные сотрудников с ролями по командам
router.get('/extended', getAllEmployeesExtended);

// Полные данные сотрудников с ролями из таблицы Roles
router.get('/full', getAllEmployeesFull);

// Старый маршрут расширенных сотрудников, если используется
router.get('/legacy-extended', getExtendedEmployeeList);

// Альтернативный расширенный маршрут (например, из другого контроллера)
router.get('/alt-extended', getExtendedEmployees);

// Получение задач по сотруднику (новый маршрут) ✅
router.get('/:id/tasks', getTasksByEmployee);

// Получение одного сотрудника по ID
router.get('/:id', getEmployeeById);

module.exports = router;
