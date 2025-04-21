import React from 'react';
import HeaderManager from '../components/HeaderManager'; // Используем HeaderManager для менеджера
import SidebarManager from '../components/SidebarManager'; // Используем SidebarManager
import ProjectManagement from '../components/ProjectManagement';
import '../styles/pages/ManagerDashboard.css';

const ManagerDashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <HeaderManager />
      <div className="dashboard-body">
        <SidebarManager />
        <main className="main-content">
          <ProjectManagement />
        </main>
      </div>
    </div>
  );
};

export default ManagerDashboard;
