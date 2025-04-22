import React from 'react';
import { Menu } from 'antd';
import { DashboardOutlined, ProjectOutlined, TeamOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import '../styles/components/Sidebar.css';

interface SidebarProps {
  role: 'employee' | 'manager';
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const location = useLocation();

  const employeeMenuItems = [
    { key: '/employee', icon: <DashboardOutlined />, label: <Link to="/employee">Главная</Link> },
    { key: '/mytasks', icon: <ProjectOutlined />, label: <Link to="/mytasks">Мои задачи</Link> },
    { key: '/teams', icon: <TeamOutlined />, label: <Link to="/teams">Мои команды</Link> },
  ];
  
  const managerMenuItems = [
    { key: '/manager', icon: <DashboardOutlined />, label: <Link to="/manager">Главная</Link> },
    { key: '/projects', icon: <ProjectOutlined />, label: <Link to="/projects">Проекты</Link> },
    { key: '/myteams', icon: <TeamOutlined />, label: <Link to="/myteams">Мои команды</Link> },
    { key: '/team-management', icon: <TeamOutlined />, label: <Link to="/team-management">Команды</Link> },
  ];

  const menuItems = role === 'manager' ? managerMenuItems : employeeMenuItems;

  return (
    <aside className="sidebar">
      <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} />
    </aside>
  );
};

export default Sidebar;
