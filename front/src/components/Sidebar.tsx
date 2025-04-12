import React from 'react';
import { Menu } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import '../styles/components/Sidebar.css';

interface SidebarProps {
  role: 'employee' | 'manager';
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const menuItems = role === 'manager'
    ? [
        { key: 'dashboard', icon: <DashboardOutlined />, label: <a href="/dashboard">Главная</a> },
        { key: 'projects', icon: <ProjectOutlined />, label: <a href="/projects">Управление проектами</a> },
        { key: 'teams', icon: <TeamOutlined />, label: <a href="/teams">Команды</a> },
        { key: 'profile', icon: <UserOutlined />, label: <a href="/profile">Профиль</a> },
      ]
    : [
        { key: 'dashboard', icon: <DashboardOutlined />, label: <a href="/dashboard">Главная</a> },
        { key: 'tasks', icon: <ProjectOutlined />, label: <a href="/tasks">Мои задачи</a> },
        { key: 'profile', icon: <UserOutlined />, label: <a href="/profile">Профиль</a> },
      ];

  return (
    <aside className="sidebar">
      <Menu
        theme="dark"
        mode="inline"
        defaultSelectedKeys={['dashboard']}
        items={menuItems}
      />
    </aside>
  );
};

export default Sidebar;
