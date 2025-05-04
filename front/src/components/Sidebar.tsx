import React, { useState, useEffect } from 'react';
import { Layout, Menu } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TableOutlined,  // Импорт новой иконки
  ProjectOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import '../styles/components/Sidebar.css';

const { Sider } = Layout;

interface SidebarProps {
  role: 'employee' | 'manager';
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // Define menu items for employees
  const employeeMenuItems = [
    { key: '/employee', icon: <TableOutlined />, label: <Link to="/employee">Доски задач</Link> },  // Заменили иконку
    { key: '/mytasks', icon: <ProjectOutlined />, label: <Link to="/mytasks">Мои задачи</Link> },
    { key: '/teams', icon: <TeamOutlined />, label: <Link to="/teams">Мои команды</Link> },
    { key: '/time-tracking', icon: <ProjectOutlined />, label: <Link to="/time-tracking">Учёт времени</Link> },
  ];

  // Define menu items for managers
  const managerMenuItems = [
    { key: '/manager', icon: <TableOutlined />, label: <Link to="/manager">Главная</Link> },  // Заменили иконку
    { key: '/projects', icon: <ProjectOutlined />, label: <Link to="/projects">Проекты</Link> },
    { key: '/myteams', icon: <TeamOutlined />, label: <Link to="/myteams">Мои команды</Link> },
    { key: '/team-management', icon: <TeamOutlined />, label: <Link to="/team-management">Команды</Link> },
    { key: '/time-tracking', icon: <ProjectOutlined />, label: <Link to="/time-tracking">Учёт времени</Link> },
  ];

  const menuItems = role === 'manager' ? managerMenuItems : employeeMenuItems;

  // Add the 'collapsed' class to layout
  useEffect(() => {
    const layoutElement = document.querySelector('.layout');
    if (layoutElement) {
      if (collapsed) {
        layoutElement.classList.add('collapsed');
      } else {
        layoutElement.classList.remove('collapsed');
      }
    }
  }, [collapsed]);

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      className="sidebar"
      width={240}
      collapsedWidth={80}
    >
      <div className="sidebar-content">
        <div className="toggle-button" onClick={toggleCollapsed}>
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </div>
    </Sider>
  );
};

export default Sidebar;
