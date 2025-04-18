import React from 'react';
import { Menu } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import '../styles/components/Sidebar.css';

interface SidebarProps {
  role: 'employee' | 'manager';
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const location = useLocation();

  const dashboardPath = role === 'manager' ? '/manager' : '/employee';

  const managerMenuItems = [
    {
      key: '/manager',
      icon: <DashboardOutlined />,
      label: <Link to={dashboardPath}>Главная</Link>,
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Управление проектами</Link>,
    },
    {
      key: '/teams',
      icon: <TeamOutlined />,
      label: <Link to="/teams">Команды</Link>,
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">Профиль</Link>,
    },
  ];

  const employeeMenuItems = [
    {
      key: '/employee',
      icon: <DashboardOutlined />,
      label: <Link to={dashboardPath}>Главная</Link>,
    },
    {
      key: '/tasks',
      icon: <ProjectOutlined />,
      label: <Link to="/tasks">Мои задачи</Link>,
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">Профиль</Link>,
    },
  ];

  const menuItems = role === 'manager' ? managerMenuItems : employeeMenuItems;

  return (
    <aside className="sidebar">
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
      />
    </aside>
  );
};

export default Sidebar;
