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
  TableColumnsType,
} from 'antd';
import Header from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import '../styles/pages/ProjectManagementPage.css';

const { Option } = Select;
const { darkAlgorithm } = theme;

interface Task {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Time_Norm: number;
  Status_Name: string;
  Order_Name: string;
  Team_Name: string;
  Employee_Name: string;
}

interface Order {
  ID_Order: number;
  Order_Name: string;
}

interface User {
  ID_User: number;
  FullName: string;
}

const TasksPageManagement: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form] = Form.useForm();

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3002/api/tasks/with-details');
      if (!response.ok) throw new Error(`Ошибка при загрузке задач: ${response.status}`);
      const data: Task[] = await response.json();
      setTasks(data);
    } catch (error) {
      message.error('Ошибка при загрузке задач');
      console.error('Fetch error:', error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3002/api/orders');
      if (!response.ok) throw new Error(`Ошибка при загрузке проектов: ${response.status}`);
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      message.error('Ошибка при загрузке проектов');
      console.error(error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3002/api/employees');
      if (!response.ok) throw new Error(`Ошибка при загрузке сотрудников: ${response.status}`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      message.error('Ошибка при загрузке сотрудников');
      console.error('Fetch error:', error);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchOrders();
    fetchUsers();
  }, [fetchTasks, fetchOrders, fetchUsers]);

  const showModal = (task?: Task) => {
    setEditingTask(task || null);
    setIsModalVisible(true);
    if (task) {
      form.setFieldsValue({
        Task_Name: task.Task_Name,
        Description: task.Description,
        Time_Norm: task.Time_Norm,
        Status_Name: task.Status_Name,
        ID_Order: orders.find(order => order.Order_Name === task.Order_Name)?.ID_Order,
        Employee_Name: task.Employee_Name,
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

  const handleFinish = async (values: {
    Task_Name: string;
    Description: string;
    Time_Norm: number;
    Status_Name: string;
    ID_Order: number;
    Employee_Name: string;
  }) => {
    const taskData = {
      Task_Name: values.Task_Name,
      Description: values.Description,
      Time_Norm: values.Time_Norm,
      Status_Name: values.Status_Name,
      ID_Order: values.ID_Order,
      Employee_Name: values.Employee_Name,
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
    } catch (error) {
      message.error('Ошибка при сохранении задачи');
      console.error(error);
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
    } catch (error) {
      message.error('Ошибка при удалении задачи');
      console.error(error);
    }
  };

  const getFilters = (field: keyof Task) => {
    const uniqueValues = Array.from(new Set(tasks.map(task => String(task[field]))));
    return uniqueValues.map(value => ({ text: value, value }));
  };

  const columns: TableColumnsType<Task> = [
    {
      title: 'Команда',
      dataIndex: 'Team_Name',
      key: 'Team_Name',
      filters: getFilters('Team_Name'),
      onFilter: (value, record) => record.Team_Name === value,
    },
    {
      title: 'Сотрудник',
      dataIndex: 'Employee_Name',
      key: 'Employee_Name',
      filters: getFilters('Employee_Name'),
      onFilter: (value, record) => record.Employee_Name === value,
    },
    {
      title: 'Проект',
      dataIndex: 'Order_Name',
      key: 'Order_Name',
      filters: getFilters('Order_Name'),
      onFilter: (value, record) => record.Order_Name === value,
    },
    { title: 'Название задачи', dataIndex: 'Task_Name', key: 'Task_Name' },
    { title: 'Описание', dataIndex: 'Description', key: 'Description' },
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
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
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
          <SidebarManager />
          <main className="main-content">
            <div className="task-management-page">
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
                  <Form.Item name="Task_Name" label="Название задачи" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="Description" label="Описание" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="Time_Norm" label="Норма времени" rules={[{ required: true }]}>
                    <Input type="number" />
                  </Form.Item>
                  <Form.Item name="Status_Name" label="Статус задачи" rules={[{ required: true }]}>
                    <Select placeholder="Выберите статус">
                      <Option value="Новая">Новая</Option>
                      <Option value="В работе">В работе</Option>
                      <Option value="Завершена">Завершена</Option>
                      <Option value="Выполнена">Выполнена</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="ID_Order" label="Проект" rules={[{ required: true }]}>
                    <Select placeholder="Выберите проект">
                      {orders.map(order => (
                        <Option key={order.ID_Order} value={order.ID_Order}>
                          {order.Order_Name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="Employee_Name"
                    label="Сотрудник"
                    rules={[{ required: true, message: 'Введите или выберите имя сотрудника' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Введите или выберите сотрудника"
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        String(option?.children).toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {users.map(user => (
                        <Option key={user.ID_User} value={user.FullName}>
                          {user.FullName}
                        </Option>
                      ))}
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

export default TasksPageManagement;
