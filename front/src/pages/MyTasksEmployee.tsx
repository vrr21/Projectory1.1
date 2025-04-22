import React, { useEffect, useState, useCallback } from 'react';
import { ConfigProvider, Table, theme, App } from 'antd';
import type { ColumnsType } from 'antd/es/table'; // Импортируем тип ColumnsType
import Sidebar from '../components/Sidebar';
import Header from '../components/HeaderEmployee';
import { useAuth } from '../contexts/useAuth';
import '../styles/pages/EmployeeDashboard.css';

const { darkAlgorithm } = theme;

interface Task {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Time_Norm: number;
  Status_Name: string;
  Order_Name: string;
  Team_Name: string;
}

const MyTasksEmployee: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { message } = App.useApp();
  const { user } = useAuth();

  // Получение задач сотрудника
  const fetchTasks = useCallback(async () => {
    if (!user?.id) {
      console.warn("❌ Нет ID пользователя для загрузки задач");
      return;
    }

    try {
      const response = await fetch(`http://localhost:3002/api/tasks/employee/${user.id}`);
      if (!response.ok) throw new Error('Ошибка загрузки задач');
      const data: Task[] = await response.json();
      console.log('🧾 Загруженные задачи сотрудника:', data);
      setTasks(data);
    } catch (error) {
      message.error('Ошибка при загрузке задач сотрудника');
      console.error(error);
    }
  }, [message, user?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]); // Зависимость fetchTasks уже добавлена

  // Функция для создания фильтров по колонкам
  const getFilters = (field: keyof Task) => {
    const uniqueValues = Array.from(new Set(tasks.map(task => String(task[field]))));
    return uniqueValues.map(value => ({ text: value, value }));
  };

  // Определяем столбцы с использованием ColumnsType<Task>
  const columns: ColumnsType<Task> = [
    {
      title: 'Проект',
      dataIndex: 'Order_Name',
      key: 'Order_Name',
      filters: getFilters('Order_Name'),
      onFilter: (value, record) => record.Order_Name === value,
      filterMultiple: false, // Опционально, если нужен одиночный фильтр
    },
    {
      title: 'Команда',
      dataIndex: 'Team_Name',
      key: 'Team_Name',
      filters: getFilters('Team_Name'),
      onFilter: (value, record) => record.Team_Name === value,
      filterMultiple: false,
    },
    {
      title: 'Название задачи',
      dataIndex: 'Task_Name',
      key: 'Task_Name',
      filters: getFilters('Task_Name'),
      onFilter: (value, record) => record.Task_Name === value,
      filterMultiple: false,
    },
    {
      title: 'Описание',
      dataIndex: 'Description',
      key: 'Description',
    },
    {
      title: 'Норма времени',
      dataIndex: 'Time_Norm',
      key: 'Time_Norm',
      sorter: (a, b) => a.Time_Norm - b.Time_Norm,
    },
    {
      title: 'Статус',
      dataIndex: 'Status_Name',
      key: 'Status_Name',
      filters: getFilters('Status_Name'),
      onFilter: (value, record) => record.Status_Name === value,
      filterMultiple: false,
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <App>
        <div className="dashboard">
          <Header />
          <div className="dashboard-body">
            <Sidebar role="employee" />
            <main className="main-content">
              <div className="content-container">
                <h1>Мои задачи</h1>
                <Table
                  dataSource={tasks}
                  columns={columns}
                  rowKey={(record: Task) => record.ID_Task.toString()}
                  pagination={{ pageSize: 5 }}
                />
              </div>
            </main>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default MyTasksEmployee;