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
  message,
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
import '../styles/components/Header.css';
import logoDark from '../assets/лого.png';
import logoLight from '../assets/лого2.png';

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
  id: number;
}

const HeaderManager: React.FC = () => {
  const { setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchOptions, setSearchOptions] = useState<OptionType[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleConfirmLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const profileMenu = {
    items: [
      { key: '1', label: <span onClick={() => navigate('/profile')}>Профиль</span> },
      { key: '2', label: <span onClick={() => setIsModalVisible(true)}>Выйти</span> },
    ],
  };

  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      setSearchOptions([]);
      return;
    }

    setSearchLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/manager/fullsearch?q=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error('Ошибка поиска');
      const data: SearchResult[] = await res.json();

      const options = data.map((item) => ({
        label: `${item.name} (${item.type === 'task' ? 'Задача' : item.type === 'order' ? 'Проект' : 'Команда'})`,
        value: item.name,
        type: item.type,
        id: item.id,
      }));

      setSearchOptions(options);
    } catch (error) {
      console.error('Ошибка при поиске:', error);
      message.error('Ошибка подключения к серверу поиска!');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelect = (_value: string, option: OptionType) => {
    const { type, id } = option;

    if (type === 'task') {
      navigate('/tasks');
    } else if (type === 'order') {
      navigate(`/projects/${id}`);
    } else if (type === 'team') {
      navigate('/team-management');
    } else {
      message.error('Неизвестный тип перехода!');
    }
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
          <AutoComplete
            options={searchOptions}
            onSearch={handleSearch}
            onSelect={(_, option) =>
              handleSelect(option.value, option as OptionType)
            }
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

          <Badge count={0} className="icon">
            <BellOutlined style={{ fontSize: '20px', color: 'var(--text-color)' }} />
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

          <Dropdown menu={profileMenu} placement="bottomRight" trigger={['click']}>
            <Avatar
              style={{ backgroundColor: '#555', marginLeft: '16px', cursor: 'pointer' }}
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
        className="dark-modal"
      >
        <p>Вы действительно хотите выйти из аккаунта?</p>
      </Modal>
    </>
  );
};

export default HeaderManager;
