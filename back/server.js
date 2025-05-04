const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения из .env файла
dotenv.config();

// Подключаем базу данных
require('./config/db'); // Подключаем конфигурацию базы данных

// Подключаем роутеры
const authRoutes = require('./routes/auth.routes');
const uploadRoutes = require('./routes/upload.routes');
const teamRoutes = require('./routes/team.routes');
const projectRoutes = require('./routes/projects.routes');
const taskRoutes = require('./routes/tasks.routes');
const taskDetailsRoutes = require('./routes/tasks.details.routes'); // Для GET /with-details
const employeeRoutes = require('./routes/employees.routes');
const reportsRoutes = require('./routes/reports');
const statusRoutes = require('./routes/status.routes');
const employeeFullSearchRouter = require('./routes/employeeFullSearch.router');
const managerRoutes = require('./routes/manager.routes');
const uploadTaskFileRouter = require('./routes/uploadTaskFile.routes');

const app = express();
const PORT = process.env.PORT || 3002; // Порт 3002

// Настройка CORS (Для разрешения запросов с клиентского приложения на порту 5173)
app.use(cors({ origin: 'http://localhost:5173', credentials: true })); // Убедитесь, что CORS настроен правильно
app.use(express.json());  // Для парсинга JSON в запросах

// Роуты API
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/taskdetails', taskDetailsRoutes); // 🔹 /api/taskdetails/with-details
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/employee', employeeFullSearchRouter);
app.use('/api/manager', managerRoutes);
app.use('/api', uploadTaskFileRouter);

// Базовый маршрут для проверки
app.get('/', (_, res) => res.send('✅ Сервер работает!'));

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту: http://localhost:${PORT}`);
});
