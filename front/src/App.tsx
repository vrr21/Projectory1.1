import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, App as AntdApp, theme } from "antd";
import './styles/theme.css';

import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ManagerDashboard from "./pages/ManagerDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeAccount from "./pages/EmployeeAccount";
import ProjectManagementPage from "./pages/ProjectManagementPage";
import TeamManagementPage from "./pages/TeamManagementPage"; // Новый импорт

import { AuthProvider } from './contexts/AuthProvider';

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
              <Route path="/profile" element={<EmployeeAccount />} />
              <Route path="/projects" element={<ProjectManagementPage />} />
              <Route path="/teams" element={<TeamManagementPage />} /> {/* Новый маршрут */}
            </Routes>
          </Router>
        </AntdApp>
      </ConfigProvider>
    </AuthProvider>
  );
};

export default App;
