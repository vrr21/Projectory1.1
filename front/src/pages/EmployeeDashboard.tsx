import React, { useEffect, useState, useCallback } from 'react';
import { message, ConfigProvider, theme, Select, Row, Col, App } from 'antd';
import { useAuth } from '../contexts/useAuth';
import HeaderEmployee from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import '../styles/pages/EmployeeDashboard.css';

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface Task {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Time_Norm: number;
  Status_Name: string;
  Order_Name: string;
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

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(user?.id ?? null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teams`);
      const data = await response.json();
      setTeams(data);
    } catch {
      messageApi.error('Не удалось загрузить команды');
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      let url = `${API_URL}/api/tasks?`;

      if (selectedEmployee) url += `employee=${selectedEmployee}&`;
      if (selectedTeam) url += `team=${selectedTeam}&`;

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
                                    <p>
                                      <i>Проект:</i> {task.Order_Name}
                                    </p>
                                    <p>
                                      <i>Норма времени:</i> {task.Time_Norm} ч
                                    </p>
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
            </main>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default EmployeeDashboard;
