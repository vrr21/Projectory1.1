import React, { useEffect, useState, useCallback } from 'react';
import {
  message,
  ConfigProvider,
  theme,
  Select,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  App
} from 'antd';
import HeaderManager from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
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
}

interface Status {
  ID_Status: number;
  Status_Name: string;
}

interface NewTaskFormData {
  Task_Name: string;
  Description: string;
  Time_Norm: number;
  ID_Status: number;
  ID_Order: number;
  Employee_Name: string;
}

const statuses = ['Новая', 'В работе', 'Завершена', 'Выполнена'];

const ManagerDashboard: React.FC = () => {
  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [statusesData, setStatusesData] = useState<Status[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams`);
      const data = await res.json();
      setTeams(data);
    } catch {
      messageApi.error('Не удалось загрузить команды');
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
      let url = `${API_URL}/api/tasks?`;
      if (selectedEmployee) url += `employee=${selectedEmployee}&`;
      if (selectedTeam) url += `team=${selectedTeam}&`;

      const res = await fetch(url);
      const data: Task[] = await res.json();

      const grouped: Record<string, Task[]> = {};
      statuses.forEach((status) => {
        grouped[status] = data.filter((task) => task.Status_Name === status);
      });
      setColumns(grouped);
    } catch {
      messageApi.error('Не удалось загрузить задачи');
    }
  }, [selectedEmployee, selectedTeam, messageApi]);

  useEffect(() => {
    fetchTeams();
    fetchStatuses();
  }, [fetchTeams, fetchStatuses]);

  useEffect(() => {
    fetchTasks();
  }, [selectedEmployee, selectedTeam, fetchTasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId.split('-')[0], 10);
    const updatedStatusName = destination.droppableId;
    const statusObj = statusesData.find((s) => s.Status_Name === updatedStatusName);

    if (!statusObj) {
      messageApi.error('Ошибка: не удалось определить статус');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ID_Status: statusObj.ID_Status }),
      });

      if (!response.ok) throw new Error();
      fetchTasks();
    } catch {
      messageApi.error('Ошибка при изменении статуса задачи');
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleFinish = async (values: NewTaskFormData) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error();
      messageApi.success('Задача создана');
      fetchTasks();
      handleCancel();
    } catch {
      messageApi.error('Ошибка при создании задачи');
    }
  };

  const goToTaskPage = () => {
    navigate('/tasks');
  };

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <App>
        <div className="dashboard">
          <HeaderManager />
          <div className="dashboard-body">
            <SidebarManager />
            <main className="main-content kanban-board">
              <h2 className="dashboard-title">
                Управление задачами
                <Button type="primary" size="small" onClick={goToTaskPage} style={{ marginLeft: '20px' }}>
                  Перейти к задачам
                </Button>
              </h2>
              {contextHolder}

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Select
                    placeholder="Выберите команду"
                    value={selectedTeam ?? -1}
                    onChange={(value) => setSelectedTeam(value === -1 ? null : value)}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value={-1}>Все команды</Select.Option>
                    {teams.map((team) => (
                      <Select.Option key={team.ID_Team} value={team.ID_Team}>
                        {team.Team_Name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={12}>
                  <Select
                    placeholder="Выберите сотрудника"
                    value={selectedEmployee ?? -1}
                    onChange={(value) => setSelectedEmployee(value === -1 ? null : value)}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value={-1}>Все сотрудники</Select.Option>
                    {teams
                      .filter(team => selectedTeam === null || team.ID_Team === selectedTeam)
                      .flatMap(team => Array.isArray(team.members) ? team.members : [])
                      .map(member => (
                        <Select.Option key={member.id} value={member.id}>
                          {member.fullName}
                        </Select.Option>
                      ))}
                  </Select>
                </Col>
              </Row>

              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="kanban-columns">
                  {statuses.map((status) => (
                    <Droppable key={status} droppableId={status}>
                      {(provided) => (
                        <div className="kanban-column" ref={provided.innerRef} {...provided.droppableProps}>
                          <h3>{status}</h3>
                          {(columns[status] || []).map((task, index) => (
                            <Draggable
                              key={`${task.ID_Task}-${status}`}
                              draggableId={`${task.ID_Task}-${status}`}
                              index={index}
                            >
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
                                    <p><i>Норма времени:</i> {task.Time_Norm} ч</p>
                                    <p><i>Сотрудник:</i> {task.Employee_Name ?? 'Не назначен'}</p>
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
                title="Создание задачи"
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={() => form.submit()}
              >
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                  <Form.Item label="Название задачи" name="Task_Name" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Описание" name="Description" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Норма времени" name="Time_Norm" rules={[{ required: true }]}>
                    <Input type="number" />
                  </Form.Item>
                  <Form.Item label="Статус" name="ID_Status" rules={[{ required: true }]}>
                    <Select>
                      {statusesData.map((s) => (
                        <Select.Option key={s.ID_Status} value={s.ID_Status}>
                          {s.Status_Name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item label="Проект" name="ID_Order" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Сотрудник" name="Employee_Name" rules={[{ required: true }]}>
                    <Input />
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
