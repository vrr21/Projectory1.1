import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Badge,
  Avatar,
  Dropdown,
  Modal,
  Tooltip,
  Drawer,
  List,
  MenuProps,
} from 'antd';
import {
  BellOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/components/Header.css';
import logoDark from '../assets/лого.png';
import logoLight from '../assets/лого2.png';

const { Header } = Layout;
const API_URL = import.meta.env.VITE_API_URL;

interface NotificationItem {
  id: number;
  title: string;
  description: string;
  Created_At: string;
  datetime?: string;
}

const HeaderManager: React.FC = () => {
  const { user, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleConfirmLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const handleDrawerOpen = () => {
    setIsDrawerVisible(true);
    setUnreadCount(0);
    localStorage.setItem('notificationsReadManager', 'true');
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/employee/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Ошибка при удалении уведомления');
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      console.error('Ошибка при удалении уведомлений:', error);
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/api/employee/notifications?employeeEmail=${user?.email}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        console.error(`Ошибка при получении уведомлений: ${res.status} ${res.statusText}`);
        return;
      }
      const data: NotificationItem[] = await res.json();
      if (!Array.isArray(data)) {
        console.error('Ожидался массив уведомлений, но получен другой формат:', data);
        return;
      }
      setNotifications(
        data.map((n) => ({
          ...n,
          datetime: new Date(n.Created_At).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        }))
      );
      if (!localStorage.getItem('notificationsReadManager')) {
        setUnreadCount(data.length);
      }
    } catch (error) {
      console.error('Ошибка при получении уведомлений:', error);
    }
  }, [user?.email]);
  

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const profileMenu: MenuProps = {
    items: [
      {
        key: '1',
        label: <span onClick={() => navigate('/profile')}>Профиль</span>,
      },
      {
        key: '2',
        label: <span onClick={() => setIsModalVisible(true)}>Выйти</span>,
      },
    ],
  };
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    const first = parts[0]?.[0] || "";
    const last = parts[1]?.[0] || "";
    return `${first}${last}`.toUpperCase();
  };
  
  return (
    <>
      <Header className="header">
        <div
          className="logo"
          onClick={() => navigate('/manager')}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--text-color)',
          }}
        >
          <img
            src={theme === 'dark' ? logoDark : logoLight}
            alt="Logo"
            style={{ height: '1.6em', objectFit: 'contain' }}
          />
          Projectory
        </div>

        <div className="right-section">
          <Badge count={unreadCount} className="icon">
            <BellOutlined
              style={{ fontSize: '20px', color: 'var(--text-color)', cursor: 'pointer' }}
              onClick={handleDrawerOpen}
            />
          </Badge>

          <Tooltip title="Переключить тему">
            <BulbOutlined
              style={{
                fontSize: '24px',
                color: theme === 'dark' ? '#00bcd4' : '#555',
                transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(180deg)',
                marginLeft: '16px',
                cursor: 'pointer',
                transition: 'transform 0.4s ease, color 0.4s ease',
              }}
              onClick={toggleTheme}
            />
          </Tooltip>
          <Tooltip title={`${user?.lastName || ""} ${user?.firstName || ""}`}>
  <Dropdown menu={profileMenu} placement="bottomRight" trigger={['click']}>
    <Avatar
      src={user?.avatar ? `${API_URL}/uploads/${user.avatar}` : undefined}
      style={{
        backgroundColor: "#555",
        marginLeft: "16px",
        cursor: "pointer",
        color: "#fff",
        fontWeight: 600,
      }}
    >
      {!user?.avatar && getInitials(`${user?.lastName} ${user?.firstName}`)}
    </Avatar>
  </Dropdown>
</Tooltip>

        </div>
      </Header>

      <Modal
        title="Подтверждение"
        open={isModalVisible}
        onOk={handleConfirmLogout}
        onCancel={() => setIsModalVisible(false)}
        okText="Да"
        cancelText="Отмена"
        className="confirm-logout-modal"

      >
        <p>Вы действительно хотите выйти из аккаунта?</p>
      </Modal>

      <Drawer
        title="Уведомления"
        placement="right"
        onClose={() => setIsDrawerVisible(false)}
        open={isDrawerVisible}
        width={350}
        className="confirm-logout-modal"

      >
        <List
          itemLayout="vertical"
          dataSource={notifications}
          style={{ marginTop: 0, paddingTop: 0 }}
          renderItem={(item) => (
            <List.Item className="notification-item" key={item.id}>
              <span
                className="notification-close"
                onClick={() => handleDeleteNotification(item.id)}
              >
                ×
              </span>
              <div className="notification-title">{item.title}</div>
              <div className="notification-description">{item.description}</div>
              <div className="notification-time">{item.datetime}</div>
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
};

export default HeaderManager;
