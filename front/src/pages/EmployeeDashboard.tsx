import React from 'react';
import HeaderEmployee from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/useAuth';
import '../styles/pages/EmployeeDashboard.css';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <HeaderEmployee/>
      <div className="dashboard-body">
        <Sidebar role="employee" />
        <main className="main-content">
          <h2>Добро пожаловать, {user?.firstName} {user?.lastName}!</h2>
         
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
