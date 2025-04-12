// src/pages/EmployeeDashboard.tsx
import React from 'react';
import AppHeader from '../components/Header';
import Sidebar from '../components/Sidebar';
import KanbanBoard from '../components/KanbanBoard';
import '../styles/pages/EmployeeDashboard.css';

const EmployeeDashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <AppHeader />
      <div className="dashboard-body">
        <Sidebar role="employee" />
        <main className="main-content">
          <KanbanBoard />
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
