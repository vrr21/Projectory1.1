const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
require('./config/db');

const authRoutes = require('./routes/auth.routes');
const uploadRoutes = require('./routes/upload.routes');
const teamRoutes = require('./routes/team.routes'); // Объединённый маршрут
const projectRoutes = require('./routes/projects.routes');
const taskRoutes = require('./routes/tasks.routes');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Роутинг
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/teams', teamRoutes); // Включает / и /add
app.use('/api/orders', projectRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/', (_, res) => res.send('✅ Сервер работает!'));

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});
