import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import './styles/theme.css';

import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ManagerDashboard from './pages/ManagerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeAccount from './pages/EmployeeAccount';
import ManagerAccount from './pages/ManagerAccount';
import ProjectManagementPage from './pages/ProjectManagementPage';
import TasksPageManagement from './pages/TasksPageManagement';
import MyTasksEmployee from './pages/MyTasksEmployee';
import TeamManagementPage from './pages/TeamManagementPage';
import MyCommandsEmployee from './pages/MyCommandsEmployee';
import MyCommandsManager from './pages/MyCommandsManager';
import EmployeeReports from './components/Reports';
import ManagerReports from './components/ManagerReports';

import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from './contexts/useAuth';

const ProtectedProfileRoute = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const isManager = user.role?.toLowerCase().includes('менеджер');
  return isManager ? <ManagerAccount /> : <EmployeeAccount />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <AntdApp>
          <Router>
            <Routes>
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/manager" element={<ManagerDashboard />} />
              <Route path="/employee" element={<EmployeeDashboard />} />
              <Route path="/profile" element={<ProtectedProfileRoute />} />

              {/* Проекты */}
              <Route path="/projects" element={<ProjectManagementPage />} />
              <Route path="/projects/:id" element={<ProjectManagementPage />} /> {/* ✅ чтобы открывать один проект */}

              {/* Задачи */}
              <Route path="/tasks" element={<TasksPageManagement />} />
              <Route path="/tasks/:id" element={<MyTasksEmployee />} /> {/* ✅ чтобы открывать задачу пользователя */}

              {/* Мои задачи */}
              <Route path="/mytasks" element={<MyTasksEmployee />} />

              {/* Команды */}
              <Route path="/team-management" element={<TeamManagementPage />} />
              <Route path="/teams" element={<MyCommandsEmployee />} />
              <Route path="/teams/:id" element={<MyCommandsEmployee />} /> {/* ✅ чтобы открывать одну команду */}
              <Route path="/myteams" element={<MyCommandsManager />} />

              {/* Отчёты */}
              <Route path="/reports" element={<EmployeeReports />} />
              <Route path="/manager-reports" element={<ManagerReports />} />
            </Routes>
          </Router>
        </AntdApp>
      </ConfigProvider>
    </AuthProvider>
  );
};

export default App;
