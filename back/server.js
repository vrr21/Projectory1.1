const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const uploadRoutes = require('./routes/upload.routes');
const teamRoutes = require('./routes/team.routes');  // Добавляем маршруты для работы с командами

require('./config/db');  // Подключение к базе данных

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Настройки CORS
app.use(cors({
  origin: 'http://localhost:5173', // Указываем фронтенд на Vite
  credentials: true,
}));

// JSON парсер для тела запроса
app.use(express.json());

// Статическая папка для загрузок (если потребуется)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Маршруты
app.use('/api', authRoutes);  // Роуты для аутентификации
app.use('/api', uploadRoutes);  // Роуты для загрузки
app.use('/api', teamRoutes);  // Роуты для работы с командами

// Тестовый маршрут
app.get('/', (req, res) => {
  res.send('✅ Сервер работает!');
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});
