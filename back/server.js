const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
require('./config/db');

const authRoutes = require('./routes/auth.routes');
const uploadRoutes = require('./routes/upload.routes');
const teamRoutes = require('./routes/team.routes');
const projectRoutes = require('./routes/projects.routes');
const taskRoutes = require('./routes/tasks.routes');
const taskDetailsRoutes = require('./routes/tasks.details.routes');
const employeeRoutes = require('./routes/employees.routes');
const reportsRoutes = require('./routes/reports');
const statusRoutes = require('./routes/status.routes');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Роуты API
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/orders', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tasks', taskDetailsRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/statuses', statusRoutes);

app.get('/', (_, res) => res.send('✅ Сервер работает!'));

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});
