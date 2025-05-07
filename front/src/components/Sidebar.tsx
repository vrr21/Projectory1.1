import React, { useState, useEffect } from 'react';
import { Layout, Menu } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TableOutlined,
  ProjectOutlined,
  TeamOutlined,
  ClockCircleOutlined // ✅ Добавили иконку часов
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

  // Элементы меню для сотрудника
  const employeeMenuItems = [
    { key: '/employee', icon: <TableOutlined />, label: <Link to="/employee">Доски задач</Link> },
    { key: '/teams', icon: <TeamOutlined />, label: <Link to="/teams">Команды и проекты</Link> },
    { key: '/time-tracking', icon: <ClockCircleOutlined />, label: <Link to="/time-tracking">Учёт времени</Link> },
  ];

  // Элементы меню для менеджера
  const managerMenuItems = [
    { key: '/manager', icon: <TableOutlined />, label: <Link to="/manager">Главная</Link> },
    { key: '/projects', icon: <ProjectOutlined />, label: <Link to="/projects">Управление проектами</Link> },
    { key: '/myteams', icon: <TeamOutlined />, label: <Link to="/myteams">Мои команды</Link> },
    { key: '/team-management', icon: <TeamOutlined />, label: <Link to="/team-management">Команды</Link> },
    { key: '/time-tracking', icon: <ProjectOutlined />, label: <Link to="/time-tracking">Учёт времени</Link> },
  ];

  const menuItems = role === 'manager' ? managerMenuItems : employeeMenuItems;

  useEffect(() => {
    const layout = document.querySelector('.layout');
    if (layout) {
      if (collapsed) {
        layout.classList.add('collapsed');
      } else {
        layout.classList.remove('collapsed');
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
