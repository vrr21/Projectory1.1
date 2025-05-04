import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';

import './styles/theme.css';
import Loader from './components/Loader'; // Новый компонент загрузки

import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ManagerDashboard from './pages/ManagerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeAccount from './pages/EmployeeAccount';
import ManagerAccount from './pages/ManagerAccount';
import ProjectManagementPage from './pages/ProjectManagementPage';
import MyTasksEmployee from './pages/MyTasksEmployee';
import TeamManagementPage from './pages/TeamManagementPage';
import MyCommandsEmployee from './pages/MyCommandsEmployee';
import MyCommandsManager from './pages/MyCommandsManager';
import EmployeeReports from './components/Reports';
import ManagerReports from './components/ManagerReports';
import TimeTrackingEmployee from './pages/TimeTrackingEmployee';  // Correct import

import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from './contexts/useAuth';

const ProtectedProfileRoute = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const isManager = user.role?.toLowerCase().includes('менеджер');
  return isManager ? <ManagerAccount /> : <EmployeeAccount />;
};

// Обёртка для анимированного появления страниц
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.4 }}
    style={{ minHeight: '100vh' }}
  >
    {children}
  </motion.div>
);

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/register" element={<PageWrapper><RegisterPage /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
        <Route path="/manager" element={<PageWrapper><ManagerDashboard /></PageWrapper>} />
        <Route path="/employee" element={<PageWrapper><EmployeeDashboard /></PageWrapper>} />
        <Route path="/profile" element={<PageWrapper><ProtectedProfileRoute /></PageWrapper>} />

        {/* Проекты */}
        <Route path="/projects" element={<PageWrapper><ProjectManagementPage /></PageWrapper>} />
        <Route path="/projects/:id" element={<PageWrapper><ProjectManagementPage /></PageWrapper>} />

        {/* Задачи */}
        <Route path="/mytasks" element={<PageWrapper><MyTasksEmployee /></PageWrapper>} />
        {/* Time Tracking Page Route */}
        <Route path="/time-tracking" element={<PageWrapper><TimeTrackingEmployee /></PageWrapper>} />

        {/* Команды */}
        <Route path="/team-management" element={<PageWrapper><TeamManagementPage /></PageWrapper>} />
        <Route path="/teams" element={<PageWrapper><MyCommandsEmployee /></PageWrapper>} />
        <Route path="/teams/:id" element={<PageWrapper><MyCommandsEmployee /></PageWrapper>} />
        <Route path="/myteams" element={<PageWrapper><MyCommandsManager /></PageWrapper>} />

        {/* Отчёты */}
        <Route path="/reports" element={<PageWrapper><EmployeeReports /></PageWrapper>} />
        <Route path="/manager-reports" element={<PageWrapper><ManagerReports /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <AntdApp>
          <Router>
            <Suspense fallback={<Loader />}>
              <AnimatedRoutes />
            </Suspense>
          </Router>
        </AntdApp>
      </ConfigProvider>
    </AuthProvider>
  );
};

export default App;
