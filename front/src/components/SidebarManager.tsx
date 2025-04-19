import React from 'react';
import { Menu } from 'antd';
import { DashboardOutlined, ProjectOutlined, TeamOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import '../styles/components/Sidebar.css';

const SidebarManager: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { key: '/manager', icon: <DashboardOutlined />, label: <Link to="/manager">Главная</Link> },
    { key: '/projects', icon: <ProjectOutlined />, label: <Link to="/projects">Проекты</Link> },
    { key: '/myteams', icon: <TeamOutlined />, label: <Link to="/myteams">Мои команды</Link> },
    { key: '/team-management', icon: <TeamOutlined />, label: <Link to="/team-management">Команды</Link> },
  ];

  return (
    <aside className="sidebar">
      <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} />
    </aside>
  );
};

export default SidebarManager;
