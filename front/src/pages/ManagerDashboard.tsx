import React, { useEffect, useState, useCallback } from 'react';
import {
  message,
  ConfigProvider,
  theme,
  Select,
  Button,
  Modal,
  Form,
  Input,
  App,
  Avatar,
  Tooltip
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import HeaderManager from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import '../styles/pages/ManagerDashboard.css';

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface Task {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Time_Norm: number;
  Status_Name: string;
  Order_Name: string;
  ID_Order: number;
  Employee_Name: string | null;
}

interface Team {
  ID_Team: number;
  Team_Name: string;
  members: TeamMember[];
}

interface TeamMember {
  id: number;
  fullName: string;
  avatar?: string;
}

interface Status {
  ID_Status: number;
  Status_Name: string;
}

interface Project {
  ID_Order: number;
  Order_Name: string;
}

const statuses = ['Новая', 'В работе', 'Завершена', 'Выполнена'];

const ManagerDashboard: React.FC = () => {
  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [statusesData, setStatusesData] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams`);
      const data = await res.json();
      setTeams(data);
    } catch {
      messageApi.error('Не удалось загрузить команды');
    }
  }, [messageApi]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects`);
      const data = await res.json();
      setProjects(data);
    } catch {
      messageApi.error('Не удалось загрузить проекты');
    }
  }, [messageApi]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/statuses`);
      const data = await res.json();
      setStatusesData(data);
    } catch {
      messageApi.error('Ошибка при загрузке статусов');
    }
  }, [messageApi]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/taskdetails/with-details`);
      const data: Task[] = await res.json();

      const grouped: Record<string, Task[]> = {};
      statuses.forEach((status) => {
        grouped[status] = data.filter((task) => task.Status_Name === status);
      });
      setColumns(grouped);
    } catch {
      messageApi.error('Не удалось загрузить задачи');
    }
  }, [messageApi]);

  useEffect(() => {
    fetchTeams();
    fetchProjects();
    fetchStatuses();
    fetchTasks();
  }, [fetchTeams, fetchProjects, fetchStatuses, fetchTasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId.split('-')[0], 10);
    const updatedStatusName = destination.droppableId;
    const statusObj = statusesData.find((s) => s.Status_Name === updatedStatusName);

    if (!statusObj) return messageApi.error('Ошибка: не удалось определить статус');

    try {
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ID_Status: statusObj.ID_Status }),
      });
      fetchTasks();
    } catch {
      messageApi.error('Ошибка при изменении статуса');
    }
  };

  const handleFinish = async (values: {
    Task_Name: string;
    Description: string;
    Time_Norm: number;
    ID_Status: number;
    ID_Order: number;
    Employee_Name: string;
  }) => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error();
      messageApi.success('Задача создана');
      form.resetFields();
      setIsModalVisible(false);
      fetchTasks();
    } catch {
      messageApi.error('Ошибка при создании задачи');
    }
  };

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <App>
        <div className="dashboard">
          <HeaderManager />
          <div className="dashboard-body">
            <SidebarManager />
            <main className="main-content kanban-board">
              <h2 className="dashboard-title">Управление задачами</h2>
              {contextHolder}
              <Button type="primary" onClick={() => setIsModalVisible(true)} style={{ margin: '12px 0' }}>
                ➕ Добавить задачу
              </Button>

              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="kanban-columns">
                  {statuses.map((status) => (
                    <Droppable key={status} droppableId={status}>
                      {(provided) => (
                        <div className="kanban-column" ref={provided.innerRef} {...provided.droppableProps}>
                          <h3>{status}</h3>
                          {(columns[status] || []).map((task, index) => (
                            <Draggable key={task.ID_Task} draggableId={`${task.ID_Task}`} index={index}>
                              {(providedDraggable) => (
                                <div
                                  className="kanban-task"
                                  ref={providedDraggable.innerRef}
                                  {...providedDraggable.draggableProps}
                                  {...providedDraggable.dragHandleProps}
                                >
                                  <div className="kanban-task-content">
                                    <strong>{task.Task_Name}</strong>
                                    <p>{task.Description}</p>
                                    <p><i>Проект:</i> {task.Order_Name}</p>
                                    <p><i>Сотрудник:</i> {task.Employee_Name ?? 'Не назначен'}</p>
                                    <div className="kanban-avatars">
                                      {teams
                                        .flatMap((t) => t.members)
                                        .filter((m) => m.fullName === task.Employee_Name)
                                        .map((m) => (
                                          <Tooltip key={m.id} title={m.fullName}>
                                            <Avatar icon={<UserOutlined />} src={m.avatar || undefined} />
                                          </Tooltip>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </DragDropContext>

              <Modal
                title="Создание задачи проекта"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
              >
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                  <Form.Item name="Task_Name" label="Название задачи" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="Description" label="Описание" rules={[{ required: true }]}>
                    <Input.TextArea />
                  </Form.Item>
                  <Form.Item name="Time_Norm" label="Норма времени (ч)" rules={[{ required: true }]}>
                    <Input type="number" />
                  </Form.Item>
                  <Form.Item name="ID_Status" label="Статус" rules={[{ required: true }]}>
                    <Select>
                      {statusesData.map((s) => (
                        <Select.Option key={s.ID_Status} value={s.ID_Status}>
                          {s.Status_Name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="ID_Order" label="Проект" rules={[{ required: true }]}>
                    <Select placeholder="Выберите проект">
                      {projects.map((proj) => (
                        <Select.Option key={proj.ID_Order} value={proj.ID_Order}>
                          {proj.Order_Name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="Employee_Name" label="Сотрудник">
                    <Select placeholder="Выберите сотрудника (опц.)">
                      {teams
                        .flatMap((t) => t.members)
                        .map((m) => (
                          <Select.Option key={m.id} value={m.fullName}>
                            {m.fullName}
                          </Select.Option>
                        ))}
                    </Select>
                  </Form.Item>
                </Form>
              </Modal>
            </main>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default ManagerDashboard;
