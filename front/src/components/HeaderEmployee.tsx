import React, { useState } from 'react';
import {
  Layout,
  Badge,
  Avatar,
  Dropdown,
  Modal,
  Tooltip,
  AutoComplete,
  Input,
  Spin,
  Drawer,
  List,
  MenuProps,
} from 'antd';
import {
  BellOutlined,
  UserOutlined,
  BulbOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/components/Header.css';

import logoIcon from '../assets/лого.png'; // ← логотип

const { Header } = Layout;
const API_URL = import.meta.env.VITE_API_URL;

interface SearchResult {
  id: number;
  name: string;
  type: 'task' | 'order' | 'team';
}

interface OptionType {
  label: string;
  value: string;
  type: 'task' | 'order' | 'team';
}

interface NotificationItem {
  id: number;
  title: string;
  description: string;
  datetime: string;
}

const HeaderEmployee: React.FC = () => {
  const { setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchOptions, setSearchOptions] = useState<OptionType[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const handleConfirmLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

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

  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      setSearchOptions([]);
      return;
    }

    setSearchLoading(true);

    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(
        `${API_URL}/api/employee/fullsearch?q=${encodeURIComponent(value)}&employeeEmail=${currentUser.email}`
      );
      if (!res.ok) throw new Error('Ошибка поиска');
      const data: SearchResult[] = await res.json();

      const options = data.map((item) => ({
        label: `${item.name} (${item.type === 'task' ? 'Задача' : item.type === 'order' ? 'Проект' : 'Команда'})`,
        value: item.name,
        type: item.type,
      }));

      setSearchOptions(options);
    } catch (error) {
      console.error('Ошибка при поиске:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelect = (value: string, option: OptionType) => {
    const { type } = option;
    if (type === 'task') navigate('/mytasks');
    else if (type === 'order') navigate('/employee');
    else if (type === 'team') navigate('/teams');
  };

  const fetchNotifications = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const res = await fetch(
        `${API_URL}/api/employee/notifications?employeeEmail=${currentUser.email}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error('Ошибка при загрузке уведомлений');
      const data: NotificationItem[] = await res.json();
      setNotifications(data);

      data.slice(0, 3).forEach((item) => {
        toast.info(`${item.title}: ${item.description}`, {
          toastId: `notif-${item.id}`,
        });
      });
    } catch (error) {
      console.error('Ошибка при загрузке уведомлений:', error);
    }
  };

  return (
    <>
      <Header className="header">
        <div
          className="logo"
          onClick={() => navigate('/employee')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--text-color)',
            cursor: 'pointer',
          }}
        >
          <img
            src={logoIcon}
            alt="Logo Icon"
            style={{ height: '1.6em', objectFit: 'contain' }}
          />
          Projectory
        </div>

        <div className="right-section">
          <AutoComplete
            options={searchOptions}
            onSearch={handleSearch}
            onSelect={handleSelect}
            style={{ width: 250, marginRight: '16px' }}
            notFoundContent={searchLoading ? <Spin size="small" /> : 'Ничего не найдено'}
          >
            <Input
              prefix={<SearchOutlined />}
              placeholder="Поиск..."
              allowClear
              className="search-input"
            />
          </AutoComplete>

          <Badge count={notifications.length} className="icon">
            <BellOutlined
              style={{ fontSize: '20px', color: 'var(--text-color)', cursor: 'pointer' }}
              onClick={() => {
                fetchNotifications();
                setIsDrawerVisible(true);
              }}
            />
          </Badge>

          <Tooltip title="Переключить тему">
            <BulbOutlined
              style={{
                fontSize: '24px',
                color: theme === 'dark' ? '#FFD700' : '#555',
                transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(180deg)',
                marginLeft: '16px',
                cursor: 'pointer',
                transition: 'transform 0.4s ease, color 0.4s ease',
              }}
              onClick={toggleTheme}
            />
          </Tooltip>

          <Dropdown menu={profileMenu} placement="bottomRight" trigger={['click']}>
            <Avatar
              style={{ backgroundColor: '#006F7A', marginLeft: '16px', cursor: 'pointer' }}
              icon={<UserOutlined />}
            />
          </Dropdown>
        </div>
      </Header>

      <Modal
        title="Подтверждение"
        open={isModalVisible}
        onOk={handleConfirmLogout}
        onCancel={() => setIsModalVisible(false)}
        okText="Да"
        cancelText="Отмена"
        className="logout-modal"
      >
        <p>Вы действительно хотите выйти из аккаунта?</p>
      </Modal>

      <Drawer
        title="Уведомления"
        placement="right"
        onClose={() => setIsDrawerVisible(false)}
        open={isDrawerVisible}
        width={350}
      >
        <List
          itemLayout="vertical"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item key={item.id}>
              <List.Item.Meta title={item.title} description={item.description} />
              <div style={{ fontSize: '12px', color: '#888' }}>{item.datetime}</div>
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
};

export default HeaderEmployee;
