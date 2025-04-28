import React, { useState } from 'react';
import { Layout, Input, Badge, Avatar, Dropdown, Modal, Tooltip, AutoComplete, Spin } from 'antd';
import { BellOutlined, UserOutlined, SearchOutlined, BulbOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/components/Header.css';

const { Header } = Layout;
const API_URL = import.meta.env.VITE_API_URL;

interface Task {
  ID_Task: number;
  Task_Name: string;
}

interface Project {
  ID_Order: number;
  Order_Name: string;
}

interface Employee {
  id: number;
  fullName: string;
}

interface Team {
  ID_Team: number;
  Team_Name: string;
}

interface SearchResultItem {
  id: number;
  label: string;
  value: string;
  type: 'task' | 'order' | 'employee' | 'team';
}

const HeaderEmployee: React.FC = () => {
  const { setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchOptions, setSearchOptions] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

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

  const onSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchOptions([]);
      return;
    }

    setLoading(true);
    try {
      const [tasksResponse, projectsResponse, employeesResponse, teamsResponse] = await Promise.all([
        fetch(`${API_URL}/api/tasks/search?q=${encodeURIComponent(query)}`),
        fetch(`${API_URL}/api/projects/search?q=${encodeURIComponent(query)}`),
        fetch(`${API_URL}/api/employees/search?q=${encodeURIComponent(query)}`),
        fetch(`${API_URL}/api/teams/search?q=${encodeURIComponent(query)}`),
      ]);

      const tasks: Task[] = tasksResponse.ok ? await tasksResponse.json() : [];
      const projects: Project[] = projectsResponse.ok ? await projectsResponse.json() : [];
      const employees: Employee[] = employeesResponse.ok ? await employeesResponse.json() : [];
      const teams: Team[] = teamsResponse.ok ? await teamsResponse.json() : [];

      const options: SearchResultItem[] = [
        ...tasks.map((t) => ({ id: t.ID_Task, label: `Задача: ${t.Task_Name}`, value: t.Task_Name, type: 'task' as const })),
        ...projects.map((p) => ({ id: p.ID_Order, label: `Проект: ${p.Order_Name}`, value: p.Order_Name, type: 'order' as const })),
        ...employees.map((e) => ({ id: e.id, label: `Сотрудник: ${e.fullName}`, value: e.fullName, type: 'employee' as const })),
        ...teams.map((tm) => ({ id: tm.ID_Team, label: `Команда: ${tm.Team_Name}`, value: tm.Team_Name, type: 'team' as const })),
      ];

      setSearchOptions(options);
    } catch (error) {
      console.error('Ошибка поиска:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSelect = (value: string) => {
    const selectedItem = searchOptions.find((item) => item.value === value);
    if (!selectedItem) return;

    switch (selectedItem.type) {
      case 'task':
        navigate('/mytasks');
        break;
      case 'order':
        navigate('/employee');
        break;
      case 'employee':
        navigate('/profile');
        break;
      case 'team':
        navigate('/teams');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <Header className="header">
        <div className="logo" onClick={() => navigate('/employee')} style={{ cursor: 'pointer' }}>
          Projectory
        </div>

        <div className="right-section">
          <AutoComplete
            className="search-input"
            popupClassName="autocomplete-dropdown"
            options={searchOptions.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            onSearch={onSearch}
            onSelect={onSelect}
            notFoundContent={loading ? <Spin size="small" /> : 'Ничего не найдено'}
            filterOption={false}
          >
            <Input
              prefix={<SearchOutlined />}
              placeholder="Поиск..."
              allowClear
            />
          </AutoComplete>

          <Badge count={0} className="icon">
            <BellOutlined style={{ fontSize: '20px', color: 'var(--text-color)' }} />
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

          <Dropdown menu={profileMenu} placement="bottomRight">
            <Avatar style={{ backgroundColor: '#006F7A', marginLeft: '16px' }} icon={<UserOutlined />} />
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

export default HeaderEmployee;
