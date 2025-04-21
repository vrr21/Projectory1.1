import React from 'react';
import { Menu } from 'antd';
import { DashboardOutlined, ProjectOutlined, TeamOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import '../styles/components/Sidebar.css';

const SidebarManager: React.FC = () => {
  const location = useLocation();

  // Define menu items for the sidebar
  const menuItems = [
    { key: '/manager', icon: <DashboardOutlined />, label: 'Главная' },
    { key: '/projects', icon: <ProjectOutlined />, label: 'Проекты' },
    { key: '/tasks', icon: <ProjectOutlined />, label: 'Распределение задач' }, // Always present here
    { key: '/myteams', icon: <TeamOutlined />, label: 'Мои команды' },
    { key: '/team-management', icon: <TeamOutlined />, label: 'Команды' },
  ];

  return (
    <aside className="sidebar">
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]} // Dynamically highlight the active menu item
        items={menuItems.map(item => ({
          key: item.key,
          icon: item.icon,
          label: <Link to={item.key}>{item.label}</Link>, // Ensure the link is rendered properly
        }))}
      />
    </aside>
  );
};

export default SidebarManager;
