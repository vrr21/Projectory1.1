// src/pages/ManagerDashboard.tsx
import React from 'react';
import HeaderEmployee from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
import ProjectManagement from '../components/ProjectManagement';
import '../styles/pages/ManagerDashboard.css';

const ManagerDashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <HeaderEmployee/>
      <div className="dashboard-body">
        <Sidebar role="manager" />
        <main className="main-content">
          <ProjectManagement />
        </main>
      </div>
    </div>
  );
};

export default ManagerDashboard;
