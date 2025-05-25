import React, { useState, useEffect } from 'react';
import { Layout, Menu } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TableOutlined,
  ProjectOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  UserAddOutlined // ✅ добавлено — это решит ошибку
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import '../styles/components/Sidebar.css';

const { Sider } = Layout;

const SidebarManager: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const menuItems = [
    {
      key: '/manager',
      icon: <TableOutlined />,
      label: <Link to="/manager">Доски задач</Link>,
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Управление проектами</Link>,
    },
    {
      key: '/manager-time-tracking',
      icon: <ClockCircleOutlined />,
      label: <Link to="/manager-time-tracking">Учёт времени</Link>,
    },
    {
      key: 'teams',
      icon: <TeamOutlined style={{ fontSize: '20px' }} />,
      label: 'Команды',
      children: [
        {
          key: '/team-management',
          label: (
            <span style={{ fontSize: '13px' }}>
              <Link to="/team-management">Все команды</Link>
            </span>
          ),
        },
        {
          key: '/myteams',
          label: (
            <span style={{ fontSize: '13px' }}>
              <Link to="/myteams">Мои команды</Link>
            </span>
          ),
        },
      ],
    },
    
    {
      key: '/employee-management',
      icon: <UserAddOutlined />,
      label: <Link to="/employee-management">Список сотрудников</Link>,
    },
    
    {
      key: '/manager-reports',
      icon: <BarChartOutlined />, // ✅ новая иконка для отчётов
      label: <Link to="/manager-reports">Отчёты</Link>,
    }
  ];

  const getOpenKeys = () => {
    if (
      location.pathname.startsWith('/team-management') ||
      location.pathname.startsWith('/myteams')
    ) {
      return ['teams'];
    }
    return [];
  };

  useEffect(() => {
    const layout = document.querySelector('.layout');
    if (layout) {
      layout.classList.toggle('collapsed', collapsed);
    }
  
    // 🔧 синхронизация с body
    if (collapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
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
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
        />
      </div>
    </Sider>
  );
};

export default SidebarManager;
