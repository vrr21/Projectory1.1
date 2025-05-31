const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
require('./config/db');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));
app.use(express.json());

// Static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/teams', require('./routes/team.routes'));
app.use('/api/projects', require('./routes/projects.routes'));
app.use('/api/tasks', require('./routes/tasks.routes'));
app.use('/api/taskdetails', require('./routes/tasks.details.routes'));
app.use('/api/employees', require('./routes/employees.routes'));
app.use('/api/employees', require('./routes/uploadAvatar.routes'));
app.use('/api/statuses', require('./routes/status.routes'));
app.use('/api/employee', require('./routes/employeeFullSearch.router'));
app.use('/api/manager', require('./routes/manager.routes'));
app.use('/api/comments', require('./routes/comments.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/reports/employee', require('./routes/employeeReports.routes'));
app.use('/api/executions', require('./routes/executions.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api', require('./routes/uploadTaskFile.routes'));
app.use('/api', require('./routes/timeTracking'));
app.use('/api', require('./routes/notifications'));
app.use('/api/roles', require('./routes/roles'));

// ✅ Export Routes
app.use('/api/export/employees', require('./routes/ListexportEmployees.routes'));
app.use('/api/export/reports/employees', require('./routes/exportEmployeeReports.routes'));
app.use('/api/export/projects', require('./routes/exportProjects.routes'));
app.use('/api/export/teams', require('./routes/exportTeams.routes'));
app.use('/api/export/tasks', require('./routes/exportTasks.routes'));
app.use('/api/export/reports', require('./routes/exportReports.routes'));
app.use('/api/export/teams/custom', require('./routes/exportTeams.routes'));
app.use('/api/export/projects-teams-employee', require('./routes/exportProjectsTeamsEmployee.routes'));

// Тестовый эндпоинт
app.get('/', (_, res) => res.send('✅ Сервер работает!'));

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту: http://localhost:${PORT}`);
});
