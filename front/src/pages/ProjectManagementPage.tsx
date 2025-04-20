import React, { useState, useEffect, useCallback } from 'react';
import {
  ConfigProvider,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  theme,
} from 'antd';
const { Option } = Select; // Исправленный импорт
import Header from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
import '../styles/pages/ProjectManagementPage.css';

const { darkAlgorithm } = theme;

interface Task {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Time_Norm: number;
  Status_Name: string;
}

const ProjectManagementPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form] = Form.useForm();

  // Получаем задачи с сервера
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3002/api/tasks');
      if (!response.ok) throw new Error('Ошибка при загрузке задач');
      const data: Task[] = await response.json();
      setTasks(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Показать модальное окно
  const showModal = (task?: Task) => {
    setEditingTask(task || null);
    setIsModalVisible(true);
    if (task) {
      form.setFieldsValue({
        Task_Name: task.Task_Name,
        Description: task.Description,
        Time_Norm: task.Time_Norm,
        Status_Name: task.Status_Name,
      });
    } else {
      form.resetFields();
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingTask(null);
    form.resetFields();
  };

  // Обработчик отправки формы
  const handleFinish = async (values: { Task_Name: string; Description: string; Time_Norm: number; Status_Name: string }) => {
    const taskData = {
      Task_Name: values.Task_Name,
      Description: values.Description,
      Time_Norm: values.Time_Norm,
      Status_Name: values.Status_Name,
    };

    try {
      const url = editingTask
        ? `http://localhost:3002/api/tasks/${editingTask.ID_Task}`
        : 'http://localhost:3002/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) throw new Error('Ошибка при сохранении задачи');
      message.success(editingTask ? 'Задача обновлена' : 'Задача создана');
      fetchTasks();
      handleCancel();
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3002/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Ошибка при удалении задачи');
      message.success('Задача удалена');
      fetchTasks();
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const columns = [
    { title: 'Название задачи', dataIndex: 'Task_Name', key: 'Task_Name' },
    { title: 'Описание', dataIndex: 'Description', key: 'Description' },
    { title: 'Норма времени', dataIndex: 'Time_Norm', key: 'Time_Norm' },
    { title: 'Статус', dataIndex: 'Status_Name', key: 'Status_Name' },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: unknown, record: Task) => (
        <>
          <Button type="link" onClick={() => showModal(record)}>Редактировать</Button>
          <Button type="link" danger onClick={() => handleDelete(record.ID_Task)}>Удалить</Button>
        </>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <div className="dashboard">
        <Header />
        <div className="dashboard-body">
          <Sidebar role="manager" />
          <main className="main-content">
            <div className="project-management-page">
              <h1>Управление задачами</h1>
              <Button type="primary" onClick={() => showModal()} style={{ marginBottom: 16 }}>
                Добавить задачу
              </Button>
              <Table dataSource={tasks} columns={columns} rowKey="ID_Task" />
              <Modal
                title={editingTask ? 'Редактировать задачу' : 'Создать задачу'}
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={() => form.submit()}
              >
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                  <Form.Item
                    name="Task_Name"
                    label="Название задачи"
                    rules={[{ required: true, message: 'Введите название задачи' }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="Description"
                    label="Описание"
                    rules={[{ required: true, message: 'Введите описание задачи' }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="Time_Norm"
                    label="Норма времени"
                    rules={[{ required: true, message: 'Введите норму времени' }]}>
                    <Input type="number" />
                  </Form.Item>
                  <Form.Item
                    name="Status_Name"
                    label="Статус задачи"
                    rules={[{ required: true, message: 'Выберите статус задачи' }]}>
                    <Select placeholder="Выберите статус задачи">
                      <Option value="Новая">Новая</Option>
                      <Option value="В работе">В работе</Option>
                      <Option value="Завершена">Завершена</Option>
                      <Option value="Выполнена">Выполнена</Option>
                    </Select>
                  </Form.Item>
                </Form>
              </Modal>
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ProjectManagementPage;
