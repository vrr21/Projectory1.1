// server.js или app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Загрузка переменных окружения
dotenv.config();

// Подключение базы данных
require('./config/db');

// Подключение маршрутов
const authRoutes = require('./routes/auth.routes');
const uploadRoutes = require('./routes/upload.routes');
const teamRoutes = require('./routes/team.routes');
const memberRoutes = require('./routes/member.routes');
const projectRoutes = require('./routes/projects.routes');
const taskRoutes = require('./routes/tasks.routes');  // Подключаем маршруты для задач

const app = express();
const PORT = process.env.PORT || 3002;

// Разрешение на CORS для фронтенда, работающего на порту 5173
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// Для парсинга JSON данных
app.use(express.json());

// Подключение маршрутов API
app.use('/api', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', teamRoutes);
app.use('/api', memberRoutes);
app.use('/api', projectRoutes);
app.use('/api', taskRoutes); // Подключаем маршрут для задач

// Проверка работоспособности сервера
app.get('/', (_, res) => res.send('✅ Сервер работает!'));

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});
