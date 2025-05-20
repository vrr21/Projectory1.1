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
const statusRoutes = require('./routes/status.routes');
const employeeFullSearchRouter = require('./routes/employeeFullSearch.router');
const managerRoutes = require('./routes/manager.routes');
const uploadTaskFileRouter = require('./routes/uploadTaskFile.routes');
const timeTrackingRoutes = require('./routes/timeTracking');
const notificationsRouter = require('./routes/notifications');
const commentsRoutes = require('./routes/comments.routes');
const reportsRoutes = require('./routes/reports.routes');
const exportProjectsRoutes = require('./routes/exportProjects.routes');
const exportTeamsRoutes = require('./routes/exportTeams.routes');
const exportTasksRoutes = require('./routes/exportTasks.routes');
const exportReportsRoutes = require('./routes/exportReports.routes');
const roleRoutes = require('./routes/roles');
const executionsRoutes = require('./routes/executions.routes');
const app = express();
const PORT = process.env.PORT || 3002;
const uploadAvatarRoutes = require('./routes/uploadAvatar.routes');
const exportEmployeeReportsRoutes = require('./routes/exportEmployeeReports.routes');
const usersRoutes = require('./routes/users.routes');

// ✅ CORS с раскрытием Content-Disposition
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

app.use(express.json());

// ✅ Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/taskdetails', taskDetailsRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/employee', employeeFullSearchRouter);
app.use('/api/manager', managerRoutes);
app.use('/api', uploadTaskFileRouter);
app.use('/api', timeTrackingRoutes);
app.use('/api', notificationsRouter);
app.use('/api/comments', commentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/executions', executionsRoutes);
// ✅ Все экспортные функции через единый префикс /api/export
app.use('/api/export', exportEmployeeReportsRoutes);
app.use('/api/export', exportProjectsRoutes);
app.use('/api/export', exportTeamsRoutes);    // Экспорт команд
app.use('/api/export', exportTasksRoutes);    // Экспорт задач
app.use('/api/export', exportReportsRoutes);  // Экспорт отчётов
app.use('/api/roles', roleRoutes);
app.use('/api/reports/employee', require('./routes/employeeReports.routes'));
app.use('/api/employees', uploadAvatarRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/manager', require('./routes/manager.routes'));
app.use('/api/employees', require('./routes/employees.routes'));
app.use('/api/users', usersRoutes);
const exportEmployeesRoutes = require('./routes/ListexportEmployees.routes');
app.use('/api/export/employees', exportEmployeesRoutes);

app.get('/', (_, res) => res.send('✅ Сервер работает!'));

// ✅ Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту: http://localhost:${PORT}`);
});
