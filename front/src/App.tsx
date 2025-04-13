import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './styles/theme.css';
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ManagerDashboard from "./pages/ManagerDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeAccount from "./pages/EmployeeAccount";
import { AuthProvider } from './contexts/AuthProvider';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/profile" element={<EmployeeAccount />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
