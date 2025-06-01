import React, { useState, useCallback, useEffect } from "react";
import {
  App,
  Button,
  Input,
  Tabs,
  ConfigProvider,
  message,
  theme,
  Form,
  InputNumber,
  DatePicker,
  Modal,
  Select,
  Upload,
} from "antd";
import {
  EyeOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import HeaderManager from "../components/HeaderManager";
import SidebarManager from "../components/SidebarManager";
import Loader from "../components/Loader";
import "../styles/pages/ManagerDashboard.css";
import { PlusOutlined } from "@ant-design/icons";

interface Employee {
  ID_Employee: number;
  Full_Name: string;
  Position: string;
  Avatar?: string | null;
}

interface Task {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Order_Name: string;
  Status_Name: string;
  Deadline?: string | null;
  Assigned_Employee_Id?: number;
  Employees: Employee[];
}

interface CreateTaskFormValues {
  ID_Team: number;
  ID_Order: number;
  Employees: number[];
  Task_Name: string;
  Description: string;
  Deadline?: string;
  Time_Norm: number;
  attachments?: File[];
  ID_Manager?: number;

}

interface Team {
  ID_Team: number;
  Team_Name: string;
}

interface Project {
  ID_Order: number;
  Order_Name: string;
  Status_Name?: string;
  End_Date?: string; // ✅ Добавлено
}

interface EmployeeFromAPI {
  ID_Employee?: number;
  ID_User?: number;
  First_Name: string;
  Last_Name: string;
  Position?: string;
  Avatar?: string | null;
}

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

const STATUSES = ["Новая", "В работе", "Завершена", "Выполнена"];

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("kanban");
  const [messageApi, contextHolder] = message.useMessage();

  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [expandedStatuses, setExpandedStatuses] = useState<string[]>([]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const openModal = async () => {
    form.resetFields();
    await loadTeams();
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const handleFinish = async (values: CreateTaskFormValues) => {
    try {
      const parentTaskPayload = {
        Task_Name: values.Task_Name,
        Description: values.Description,
        Deadline: values.Deadline ? dayjs(values.Deadline).toISOString() : null,
        ID_Team: values.ID_Team,
        ID_Order: values.ID_Order,
        Time_Norm: values.Time_Norm,
        ID_Manager: values.ID_Manager 
      };
      

      const parentResponse = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parentTaskPayload),
      });

      const parentTask = await parentResponse.json();
      const parentTaskId = parentTask.ID_Task;

      // Для каждого сотрудника создаём отдельную подзадачу
      const childTaskPromises = values.Employees.map(async (employeeId) => {
        const childTaskPayload = {
          ...parentTaskPayload,
          Parent_Task_Id: parentTaskId,
          Assigned_Employee_Id: employeeId,
        };
        return fetch(`${API_URL}/api/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(childTaskPayload),
        });
      });
      await Promise.all(childTaskPromises);
      messageApi.success("Задача успешно создана");
      setIsModalVisible(false);
      await loadTasks();
      

    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при создании задачи");
    }
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/tasks`);
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при загрузке задач");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  const loadTeams = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/teams`);
      const data = await response.json();
      setTeams(data);
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при загрузке команд");
    }
  }, [messageApi]);

 const loadProjectsAndEmployees = useCallback(
  async (teamId: number) => {
    try {
      const [projectsResponse, employeesResponse] = await Promise.all([
        fetch(`${API_URL}/api/projects/by-team?teamId=${teamId}`),
        fetch(`${API_URL}/api/employees/by-team?teamId=${teamId}`),
      ]);

      const rawProjects: Project[] = await projectsResponse.json();
      const projects = rawProjects.filter(
        (proj) => proj.Status_Name !== "Закрыт"
      );
      

      const employees: EmployeeFromAPI[] = await employeesResponse.json();

      console.log("Employees from API:", employees); // Debug

      const formattedEmployees: Employee[] = employees.map((emp) => ({
        ID_Employee: emp.ID_Employee ?? emp.ID_User ?? 0,
        Full_Name: `${emp.First_Name ?? ""} ${emp.Last_Name ?? ""}`.trim(),
        Position: emp.Position ?? "Без должности",
        Avatar: emp.Avatar ?? null,
      }));

      setFilteredProjects(projects);
      setFilteredEmployees(formattedEmployees);
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при загрузке проектов и сотрудников");
    }
  },
  [messageApi]
);


  const handleTeamChange = (teamId: number) => {
    form.setFieldValue("ID_Team", teamId);
    loadProjectsAndEmployees(teamId);
    form.setFieldValue("ID_Order", undefined);
    form.setFieldValue("Employees", []);
  };

  const handleProjectChange = async (projectId: number) => {
    const project = filteredProjects.find((p) => p.ID_Order === projectId);
    if (project) {
      try {
        const response = await fetch(`${API_URL}/api/projects/${projectId}`);
        const projectData = await response.json();
        form.setFieldValue('ID_Manager', projectData.ID_Manager);
      } catch (err) {
        console.error("Ошибка при получении проекта:", err);
      }
    }
  };
  

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = tasks
  .filter((task) => task.Status_Name !== 'Архив') // если нужно скрывать архивные задачи

    .filter((task) => {
      const query = searchQuery.toLowerCase().trim();
      return (
        !query ||
        task.Task_Name.toLowerCase().includes(query) ||
        task.Description.toLowerCase().includes(query) ||
        task.Order_Name.toLowerCase().includes(query)
      );
    });

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId.replace("task-", ""), 10);
    const updatedStatus = destination.droppableId;

    try {
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Status_Name: updatedStatus }),
      });

      setTasks((prev) =>
        prev.map((task) =>
          task.ID_Task === taskId
            ? { ...task, Status_Name: updatedStatus }
            : task
        )
      );
      messageApi.success(`Статус задачи обновлен на "${updatedStatus}"`);
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при изменении статуса задачи");
    }
  };
  // Вспомогательная функция для определения статуса дедлайна
  const getDeadlineStatus = (deadline?: string | null, status?: string) => {
    if (!deadline || !status) return null;

    if (["Выполнена", "Завершена"].includes(status)) {
      return {
        label: status,
        color: "#4caf50", // зелёный
      };
    }

    const now = dayjs();
    const end = dayjs(deadline);
    const diff = end.diff(now, "day");

    if (diff < 0) {
      return { label: "Просрочено", color: "#f44336" }; // красный
    } else if (diff <= 3) {
      return { label: `${diff} дн.`, color: "#ff9800" }; // жёлтый
    } else {
      return { label: `${diff} дн.`, color: "#4caf50" }; // зелёный
    }
  };

  const renderKanbanBoard = () => (
    <>
      <div
        className="filter-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <Button
          className="dark-action-button"
          onClick={() => openModal()}
          icon={<PlusOutlined style={{ color: "inherit" }} />}
        >
          Добавить задачу
        </Button>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Input
            placeholder="Поиск задач..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 250 }}
          />
          <Button icon={<DownloadOutlined />}>Экспорт</Button>
        </div>
      </div>

      {/* Статусы и Kanban Board */}
      <div
        className="kanban-status-row"
        style={{
          display: "flex",
          gap: "12px",
          paddingInline: "4px",
          marginBottom: "12px",
        }}
      >
        {STATUSES.map((status) => (
          <div
            key={`header-${status}`}
            className="kanban-status-header"
            style={{
              flex: "1 1 0",
              minWidth: "280px",
              maxWidth: "100%",
            }}
          >
            {status}
          </div>
        ))}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div
          className="kanban-columns"
          style={{
            display: "flex",
            gap: "12px",
            paddingInline: "4px",
            overflowX: "auto",
          }}
        >
          {STATUSES.map((status) => {
            const tasksForStatus = filteredTasks.filter(
              (task) => task.Status_Name === status
            );
            const isExpanded = expandedStatuses.includes(status);

            return (
              <Droppable key={status} droppableId={status}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="kanban-column"
                    style={{
                      flex: "1 1 0",
                      minWidth: "280px",
                      backgroundColor: "#2a2a2a",
                      padding: "1.5rem 1rem",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    {(isExpanded
                      ? tasksForStatus
                      : tasksForStatus.slice(0, 5)
                    ).map((task, index) => {
                      const deadlineInfo = getDeadlineStatus(
                        task.Deadline,
                        task.Status_Name
                      );
                      return (
                        <Draggable
                          key={`task-${task.ID_Task}`}
                          draggableId={`task-${task.ID_Task}`}
                          index={index}
                        >
                          {(providedDraggable) => (
                            <div
                              ref={providedDraggable.innerRef}
                              {...providedDraggable.draggableProps}
                              {...providedDraggable.dragHandleProps}
                              className="kanban-task"
                            >
                              <div className="kanban-task-content">
                                <strong>{task.Task_Name}</strong>
                                <p>{task.Description}</p>
                                <p>
                                  <i>Проект:</i> {task.Order_Name}
                                </p>
                                <p>
                                  <i>Данный модуль выполняет:</i>{" "}
                                  {task.Employees.find(
                                    (emp) =>
                                      emp.ID_Employee ===
                                      task.Assigned_Employee_Id
                                  )?.Full_Name || "Не назначено"}
                                </p>

                                {(() => {
                                  const otherEmployees = task.Employees.filter(
                                    (emp) =>
                                      emp.ID_Employee !==
                                      task.Assigned_Employee_Id
                                  );
                                  return otherEmployees.length > 0 ? (
                                    <div
                                      className="kanban-avatars-row"
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginTop: "8px",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: "13px",
                                          fontStyle: "italic",
                                          color: "#bbb",
                                          marginRight: "8px",
                                        }}
                                      >
                                        Задача назначена также:
                                      </span>
                                      <div
                                        className="kanban-avatars"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "0px",
                                        }}
                                      >
                                        {otherEmployees.map((emp, idx) => (
                                          <div
                                            key={emp.ID_Employee}
                                            title={emp.Full_Name}
                                            style={{
                                              marginLeft:
                                                idx === 0 ? "0" : "-8px",
                                              zIndex:
                                                otherEmployees.length - idx,
                                            }}
                                          >
                                            {emp.Avatar &&
                                            emp.Avatar !== "null" ? (
                                              <img
                                                src={`${API_URL}/uploads/${encodeURIComponent(
                                                  emp.Avatar
                                                )}`}
                                                alt={emp.Full_Name}
                                                style={{
                                                  width: "28px",
                                                  height: "28px",
                                                  borderRadius: "50%",
                                                  objectFit: "cover",
                                                  border: "2px solid #444",
                                                  backgroundColor: "#555",
                                                  cursor: "pointer",
                                                }}
                                              />
                                            ) : (
                                              <div
                                                style={{
                                                  width: "28px",
                                                  height: "28px",
                                                  borderRadius: "50%",
                                                  backgroundColor: "#777",
                                                  color: "#fff",
                                                  fontSize: "12px",
                                                  fontWeight: "bold",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  border: "2px solid #444",
                                                  cursor: "pointer",
                                                }}
                                              >
                                                {emp.Full_Name.split(" ")
                                                  .map((n) => n[0])
                                                  .slice(0, 2)
                                                  .join("")
                                                  .toUpperCase()}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null;
                                })()}

                                {/* Дедлайн */}
                                <div
                                  style={{
                                    marginTop: 8,
                                    fontSize: "13px",
                                    fontStyle: "italic",
                                    color: "#bbb",
                                  }}
                                >
                                  Дедлайн:{" "}
                                  <span
                                    style={{
                                      color: "#09d0a0",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {task.Deadline
                                      ? dayjs(task.Deadline).format(
                                          "DD.MM.YYYY HH:mm"
                                        )
                                      : "Без срока"}
                                  </span>
                                </div>
                                {/* Футер задачи */}
                                <div
                                  className="task-footer"
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginTop: "8px",
                                  }}
                                >
                                  <Button
                                    type="link"
                                    icon={<EyeOutlined />}
                                    size="small"
                                    style={{ padding: 0 }}
                                    onClick={() =>
                                      navigate(`/tasks/${task.ID_Task}`)
                                    }
                                  />
                                  <div
                                    style={{
                                      backgroundColor: deadlineInfo?.color,
                                      color: "#fff",
                                      borderRadius: "4px",
                                      padding: "2px 6px",
                                      fontSize: "12px",
                                      minWidth: "80px",
                                      textAlign: "center",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    {["Выполнена", "Завершена"].includes(
                                      task.Status_Name
                                    ) && <ClockCircleOutlined />}
                                    {deadlineInfo?.label}
                                  </div>
                                  <Button
                                    type="link"
                                    icon={<MessageOutlined />}
                                    size="small"
                                    style={{ padding: 0 }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {tasksForStatus.length > 5 && !isExpanded && (
                      <Button
                        className="show-more-button"
                        onClick={() =>
                          setExpandedStatuses([...expandedStatuses, status])
                        }
                        style={{
                          backgroundColor: "#1f1f1f",
                          color: "#f0f0f0",
                          border: "1px solid #444",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontWeight: 500,
                          textAlign: "center",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                        }}
                      >
                        Смотреть далее ({tasksForStatus.length - 5} ещё)
                      </Button>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </>
  );

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <App>
        {contextHolder}
        <div className="manager-dashboard">
          <HeaderManager />
          <div className="dashboard-body">
            <SidebarManager />
            <main className="main-content">
              <h1 style={{ fontSize: "28px", marginBottom: "24px" }}>
                Доска задач
              </h1>
              {loading ? (
                <Loader />
              ) : (
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  type="card"
                  items={[
                    {
                      label: "Kanban-доска",
                      key: "kanban",
                      children: renderKanbanBoard(),
                    },
                    {
                      label: "Журнал задач",
                      key: "table",
                      children: <div>Здесь будет таблица задач...</div>,
                    },
                  ]}
                />
              )}
            </main>
          </div>
        </div>

        <Modal
          title="Создать задачу"
          open={isModalVisible}
          onCancel={closeModal}
          onOk={() => form.submit()}
          okText="Сохранить"
          cancelText="Отмена"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            initialValues={{ Time_Norm: 1 }}
          >
            <Form.Item
              label="Команда"
              name="ID_Team"
              rules={[{ required: true, message: "Выберите команду" }]}
            >
              <Select
                placeholder="Выберите команду"
                onChange={handleTeamChange}
              >
                {teams.map((team) => (
                  <Select.Option key={team.ID_Team} value={team.ID_Team}>
                    {team.Team_Name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="Проект"
              name="ID_Order"
              rules={[{ required: true, message: "Выберите проект" }]}
            >
              <Select
                key={form.getFieldValue("ID_Team")}
                placeholder={
                  filteredProjects.length > 0
                    ? "Выберите проект"
                    : "Сначала выберите команду"
                }
                disabled={filteredProjects.length === 0}
                onChange={handleProjectChange}
              >
                {filteredProjects.map((project) => (
                  <Select.Option
                    key={project.ID_Order}
                    value={project.ID_Order}
                  >
                    {project.Order_Name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Исполнители"
              name="Employees"
              rules={[{ required: true, message: "Выберите участников" }]}
            >
              <Select mode="multiple" placeholder="Выберите участников">
                {filteredEmployees.map((emp) => (
                  <Select.Option key={emp.ID_Employee} value={emp.ID_Employee}>
                    {emp.Full_Name} — {emp.Position}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="Название задачи"
              name="Task_Name"
              rules={[{ required: true, message: "Введите название задачи" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Описание"
              name="Description"
              rules={[{ required: true, message: "Введите описание задачи" }]}
            >
              <Input.TextArea />
            </Form.Item>
            <Form.Item label="Дедлайн" name="Deadline">
            <DatePicker
  style={{ width: "100%" }}
  showTime
  format="DD.MM.YYYY HH:mm"
  disabledDate={(current) => {
    const now = dayjs();
    const selectedProject = filteredProjects.find(
      (p) => p.ID_Order === form.getFieldValue("ID_Order")
    );

    // 🚨 Ограничение по дедлайну проекта
    if (selectedProject && selectedProject.End_Date) {
      const projectEnd = dayjs(selectedProject.End_Date).endOf("day");
      if (current && current.isAfter(projectEnd)) {
        return true;
      }
    }

    // 🚨 Нельзя выбрать дату раньше сегодняшнего дня
    return current && current.isBefore(now.startOf("day"));
  }}
/>

            </Form.Item>

            <Form.Item
              label="Норма времени (часы)"
              name="Time_Norm"
              rules={[{ required: true, message: "Введите норму времени" }]}
            >
              <InputNumber style={{ width: "100%" }} min={0} step={0.5} />
            </Form.Item>
            <Form.Item label="Прикрепить файлы">
              <Upload beforeUpload={() => false} multiple>
                <Button>Выберите файлы</Button>
              </Upload>
            </Form.Item>
          </Form>
        </Modal>
      </App>
    </ConfigProvider>
  );
};

export default ManagerDashboard;
