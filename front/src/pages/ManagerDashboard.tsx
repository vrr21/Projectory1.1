import React, { useEffect, useState, useCallback } from 'react';
import { message, ConfigProvider, theme, Select, Row, Col, Button, Modal, Form, Input } from 'antd';
import HeaderManager from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom'; // Используем useNavigate для перехода на другую страницу
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

const statuses = ['Новая', 'В работе', 'Завершена', 'Выполнена'];

const ManagerDashboard: React.FC = () => {
  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate(); // Используем useNavigate для перехода на другую страницу

  // Получение команд
  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/teams`);
      const data = await response.json();
      setTeams(data);
    } catch {
      messageApi.error('Не удалось загрузить команды');
    }
  }, [messageApi]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Получение задач для выбранной команды или сотрудника
  const fetchTasks = useCallback(async () => {
    try {
      let url = `${API_URL}/api/tasks?`;

      if (selectedEmployee) {
        url += `employee=${selectedEmployee}&`;
      }

      if (selectedTeam) {
        url += `team=${selectedTeam}&`;
      }

      const response = await fetch(url);
      const data: Task[] = await response.json();

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
    fetchTasks();
  }, [selectedEmployee, selectedTeam, fetchTasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination || source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId, 10);
    const updatedStatus = destination.droppableId;

    if (!statuses.includes(updatedStatus)) {
      console.error(`Недопустимый статус: ${updatedStatus}`);
      messageApi.error('Ошибка: Невалидный статус задачи');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status_Name: updatedStatus }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при изменении статуса задачи');
      }
      fetchTasks();
    } catch (error) {
      messageApi.error('Ошибка при изменении статуса задачи');
      console.error(error);
    }
  };

  // Закрытие модального окна
  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // Обработка отправки формы для новой задачи
  const handleFinish = async (values: { Task_Name: string; Description: string; Time_Norm: number; Status_Name: string; ID_Order: number; Employee_Name: string; }) => {
    const taskData = {
      Task_Name: values.Task_Name,
      Description: values.Description,
      Time_Norm: values.Time_Norm,
      Status_Name: values.Status_Name,
      ID_Order: values.ID_Order,
      Employee_Name: values.Employee_Name,
    };

    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error('Ошибка при создании задачи');
      }
      messageApi.success('Задача создана');
      fetchTasks();
      handleCancel();
    } catch (error) {
      messageApi.error('Ошибка при создании задачи');
      console.error(error);
    }
  };

  // Переход на страницу управления задачами
  const goToTaskPage = () => {
    navigate('/tasks'); // Переход на страницу TasksPageManagement
  };

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <div className="dashboard">
        <HeaderManager />
        <div className="dashboard-body">
          <SidebarManager />
          <main className="main-content kanban-board">
            <h2 className="dashboard-title">
              Управление задачами
              <Button 
                type="primary" 
                size="small" 
                style={{ marginLeft: '20px' }} 
                onClick={goToTaskPage} // Переход на страницу задач
              >
                Перейти к задачам
              </Button>
            </h2>
            {contextHolder}

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Select
                  placeholder="Выберите команду"
                  value={selectedTeam || undefined}
                  onChange={(value) => setSelectedTeam(value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value={null}>Все команды</Select.Option>
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
                  value={selectedEmployee || undefined}
                  onChange={(value: number) => setSelectedEmployee(value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value={null}>Все сотрудники</Select.Option>
                  {teams
                    .filter((team) => selectedTeam === null || team.ID_Team === selectedTeam) // Фильтруем по выбранной команде
                    .flatMap((team) =>
                      Array.isArray(team.members) ? team.members : [] // Проверяем, что members - это массив
                    )
                    .map((member) => (
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
                      <div
                        className="kanban-column"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
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
              visible={isModalVisible}
              onCancel={handleCancel}
              onOk={() => form.submit()}
            >
              <Form form={form} onFinish={handleFinish} layout="vertical">
                <Form.Item label="Название задачи" name="Task_Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item label="Описание" name="Description" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item label="Норма времени" name="Time_Norm" rules={[{ required: true }]}>
                  <Input type="number" />
                </Form.Item>
                <Form.Item label="Статус задачи" name="Status_Name" rules={[{ required: true }]}>
                  <Select>
                    {statuses.map((status) => (
                      <Select.Option key={status} value={status}>{status}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item label="Проект" name="ID_Order" rules={[{ required: true }]}>
                  <Select>
                    {/* Добавьте список проектов */}
                  </Select>
                </Form.Item>
                <Form.Item label="Сотрудник" name="Employee_Name" rules={[{ required: true }]}>
                  <Select>
                    {/* Добавьте список сотрудников */}
                  </Select>
                </Form.Item>
              </Form>
            </Modal>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ManagerDashboard;
