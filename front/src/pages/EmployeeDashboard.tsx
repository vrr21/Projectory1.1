import React, { useEffect, useState, useCallback } from 'react';
import {
  message,
  ConfigProvider,
  theme,
  App,
  Tabs,
  Table,
  Avatar,
  Tooltip,
  Modal,
  Button,
} from 'antd';
import {
  EyeOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/useAuth';
import HeaderEmployee from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import dayjs from 'dayjs';
import '../styles/pages/EmployeeDashboard.css';

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface Employee {
  ID_Employee: number;
  Full_Name?: string;
  Avatar?: string;
}

interface Task {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Time_Norm: number;
  Status_Name: string;
  Order_Name: string;
  Team_Name: string;
  Deadline?: string | null;
  Employees: Employee[];
}

const statuses = ['Новая', 'В работе', 'Завершена', 'Выполнена'];

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState('kanban');
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  const getInitials = (fullName: string = '') => {
    const [first, second] = fullName.split(' ');
    return `${first?.[0] ?? ''}${second?.[0] ?? ''}`.toUpperCase();
  };

  const fetchTasks = useCallback(async () => {
    try {
      const url = `${API_URL}/api/tasks?employee=${user?.id}`;
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
  }, [user?.id, messageApi]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId, 10);
    const updatedStatus = destination.droppableId;

    try {
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status_Name: updatedStatus }),
      });
      fetchTasks();
    } catch {
      messageApi.error('Ошибка при изменении статуса задачи');
    }
  };

  const renderEmployees = (employees: Employee[]) => {
    if (!employees?.length) return '—';
    return (
      <Avatar.Group max={{ count: 3 }}>
        {employees.map((emp) => (
          <Tooltip key={emp.ID_Employee} title={emp.Full_Name || '—'}>
            <Avatar
              src={emp.Avatar ? `${API_URL}/uploads/${emp.Avatar}` : undefined}
              style={{ backgroundColor: emp.Avatar ? 'transparent' : '#777' }}
              icon={!emp.Avatar ? <UserOutlined /> : undefined}
            >
              {!emp.Avatar && getInitials(emp.Full_Name || '')}
            </Avatar>
          </Tooltip>
        ))}
      </Avatar.Group>
    );
  };

  const getDeadlineClass = (deadline: string) => {
    const now = dayjs();
    const time = dayjs(deadline);
    if (time.isBefore(now)) return 'expired';
    if (time.diff(now, 'hour') <= 24) return 'warning';
    return 'safe';
  };

  const renderDeadlineBox = (deadline: string | null | undefined) => {
    if (!deadline) {
      return (
        <div className="deadline-box undefined">
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          Дедлайн: не назначено
        </div>
      );
    }

    const time = dayjs(deadline);
    const now = dayjs();
    const diffDays = time.diff(now, 'day');
    const diffHours = time.diff(now, 'hour');

    let label = '';
    if (diffDays > 0) label = `Осталось ${diffDays} дн`;
    else if (diffHours > 0) label = `Осталось ${diffHours} ч`;
    else label = 'Срок истёк';

    return (
      <div className={`deadline-box ${getDeadlineClass(deadline)}`}>
        <ClockCircleOutlined style={{ marginRight: 6 }} />
        {label}
      </div>
    );
  };

  const tableColumns = [
    { title: 'Проект', dataIndex: 'Order_Name', key: 'Order_Name' },
    { title: 'Название задачи', dataIndex: 'Task_Name', key: 'Task_Name' },
    { title: 'Описание', dataIndex: 'Description', key: 'Description' },
    { title: 'Норма времени (часы)', dataIndex: 'Time_Norm', key: 'Time_Norm' },
    { title: 'Статус', dataIndex: 'Status_Name', key: 'Status_Name' },
    {
      title: 'Дедлайн',
      dataIndex: 'Deadline',
      key: 'Deadline',
      render: (val: string | null) =>
        val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '—',
    },
    {
      title: 'Сотрудники',
      dataIndex: 'Employees',
      key: 'Employees',
      render: renderEmployees,
    },
  ];

  const openViewModal = (task: Task) => setViewingTask(task);
  const closeViewModal = () => setViewingTask(null);

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <App>
        <div className="dashboard">
          <HeaderEmployee />
          <div className="dashboard-body">
            <Sidebar role="employee" />
            <main className="main-content kanban-board">
              <h2 className="dashboard-title">Мои доски задач</h2>
              {contextHolder}
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                items={[
                  {
                    label: 'Kanban-доска',
                    key: 'kanban',
                    children: (
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
                                      key={`${task.ID_Task}`}
                                      draggableId={`${task.ID_Task}`}
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

                                            <div className="task-footer">
  <button
    type="button"
    className="eye-button"
    onClick={() => openViewModal(task)}
  >
    <EyeOutlined className="kanban-icon kanban-icon--big" />
  </button>
  {renderDeadlineBox(task.Deadline)}
</div>


                                            <div className="kanban-avatars">
                                              {renderEmployees(task.Employees)}
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
                    ),
                  },
                  {
                    label: 'Список задач (таблица)',
                    key: 'table',
                    children: (
                      <Table
                        dataSource={Object.values(columns).flat()}
                        columns={tableColumns}
                        rowKey="ID_Task"
                      />
                    ),
                  },
                ]}
              />

              <Modal
                title="Информация о задаче"
                open={!!viewingTask}
                onCancel={closeViewModal}
                footer={[
                  <Button key="close" onClick={closeViewModal}>
                    Закрыть
                  </Button>,
                ]}
              >
                {viewingTask && (
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    <p><strong>Название:</strong> {viewingTask.Task_Name}</p>
                    <p><strong>Описание:</strong> {viewingTask.Description}</p>
                    <p><strong>Проект:</strong> {viewingTask.Order_Name}</p>
                    <p><strong>Команда:</strong> {viewingTask.Team_Name || '—'}</p>
                    <p><strong>Статус:</strong> {viewingTask.Status_Name}</p>
                    <p><strong>Дедлайн:</strong> {viewingTask.Deadline ? dayjs(viewingTask.Deadline).format('YYYY-MM-DD HH:mm') : '—'}</p>
                    <p><strong>Норма времени:</strong> {viewingTask.Time_Norm} ч.</p>
                    <p><strong>Сотрудники:</strong></p>
                    <div className="kanban-avatars">
                      {viewingTask.Employees.map((emp, idx) => (
                        <Tooltip key={`emp-view-${emp.ID_Employee}-${idx}`} title={emp.Full_Name}>
                          <Avatar
                            src={emp.Avatar ? `${API_URL}/uploads/${emp.Avatar}` : undefined}
                            icon={!emp.Avatar ? <UserOutlined /> : undefined}
                            style={{ backgroundColor: emp.Avatar ? 'transparent' : '#777', marginRight: 4 }}
                          >
                            {!emp.Avatar && getInitials(emp.Full_Name)}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </Modal>
            </main>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default EmployeeDashboard;
