import React, { useEffect, useState, useCallback } from 'react';
import { ConfigProvider, Table, theme, App } from 'antd';
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
  }, [message, user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const columns = [
    { title: 'Проект', dataIndex: 'Order_Name', key: 'Order_Name' },
    { title: 'Команда', dataIndex: 'Team_Name', key: 'Team_Name' },
    { title: 'Название задачи', dataIndex: 'Task_Name', key: 'Task_Name' },
    { title: 'Описание', dataIndex: 'Description', key: 'Description' },
    { title: 'Норма времени', dataIndex: 'Time_Norm', key: 'Time_Norm' },
    { title: 'Статус', dataIndex: 'Status_Name', key: 'Status_Name' },
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
                  rowKey={(record) => record.ID_Task.toString()}
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
