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
import { FilterOutlined } from "@ant-design/icons";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, InboxOutlined } from "@ant-design/icons";

interface Employee {
  ID_Employee: number;
  ID_User?: number;
  Full_Name: string;
  Employee_Name?: string;  // <-- Добавляем!
  Position: string;
  Avatar?: string | null;
  ID_Manager?: number;
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
  AlsoAssignedEmployees?: {
    ID_User: number;
    EmployeeName: string;
    Avatar?: string | null;
  }[];
  ID_Order?: number;
  ID_Team?: number;
  Time_Norm?: number;
  Team_Name?: string;
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
  End_Date?: string;
  ID_Team?: number; // 👈 Добавляем это свойство
}

interface EmployeeFromAPI {
  ID_Employee?: number;
  ID_User?: number;
  First_Name: string;
  Last_Name: string;
  Position?: string;
  Avatar?: string | null;
}

interface RawTask {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Order_Name: string;
  Status_Name: string;
  Deadline?: string | null;
  Assigned_Employee_Id?: number;
  Employees: RawEmployee[];
  AlsoAssignedEmployees?: {
    ID_User: number;
    EmployeeName: string;
    Avatar?: string | null;
  }[];
  ID_Order?: number;
  ID_Team?: number;
  Time_Norm?: number;
  Team_Name?: string;
}

interface RawEmployee {
  ID_Employee?: number;
  ID_User?: number;
  Employee_Name?: string;
  Full_Name?: string;
  Position?: string;
  Avatar?: string | null;
}

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

const STATUSES = ["Новая", "В работе", "Завершена", "Выполнена"];

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<{
    name?: string;
    teamId?: number;
    projectId?: number;
  }>({});

  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("kanban");
  const [messageApi, contextHolder] = message.useMessage();
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const taskNames = Array.from(new Set(tasks.map((task) => task.Task_Name)));
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  useEffect(() => {
    const loadAllProjects = async () => {
      try {
        const response = await fetch(`${API_URL}/api/projects`);
        const data = await response.json();
        setAllProjects(data);
      } catch (err) {
        console.error("Ошибка при загрузке всех проектов:", err);
      }
    };
    loadAllProjects();
  }, []);

  const archiveTask = async (taskId: number) => {
    try {
      await fetch(`${API_URL}/api/tasks/${taskId}/archive`, {
        method: "PUT",
      });
      messageApi.success("Задача успешно заархивирована");
      await loadTasks();
    } catch (error) {
      console.error("Ошибка при архивировании задачи:", error);
      messageApi.error("Не удалось архивировать задачу");
    }
  };

  const [taskDetails, setTaskDetails] = useState<Task | null>(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const loadTaskDetails = async (taskId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}/details`);
      if (!response.ok) throw new Error("Ошибка при загрузке задачи");
      const data = await response.json();
      setTaskDetails(data);
      setIsDetailsModalVisible(true);
    } catch (error) {
      console.error("Ошибка при загрузке деталей задачи:", error);
      messageApi.error("Не удалось загрузить детали задачи");
    }
  };

  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [expandedStatuses, setExpandedStatuses] = useState<string[]>([]);
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    taskId: number | null;
    targetStatus: string;
  } | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const [form] = Form.useForm();

  useEffect(() => {
    if (editingTaskId !== null) {
      const task = tasks.find((t) => t.ID_Task === editingTaskId);
      if (task) {
        form.setFieldsValue({
          ID_Team: task.ID_Team,
          ID_Order: task.ID_Order,
          Employees: task.Employees.map((emp) => emp.ID_Employee),
          Task_Name: task.Task_Name,
          Description: task.Description,
          Deadline: task.Deadline ? dayjs(task.Deadline) : null,
          Time_Norm: task.Time_Norm ?? 1,
          ID_Manager: task.Employees[0]?.ID_Manager,
        });
      }
    }
  }, [editingTaskId, tasks, form]);

  const openModal = async () => {
    form.resetFields();
    await loadTeams();
    setFilteredProjects(allProjects); // 👈 добавили!
    setIsModalVisible(true);
  };

  const openEditModal = async (task: Task) => {
    try {
      await loadTeams();
      // 👇 Ждём проекты и сотрудников
      if (task.ID_Team) {
        await loadProjectsAndEmployees(task.ID_Team);
      }

      // 👇 Ждём, чтобы React отрендерил Select с опциями
      setTimeout(() => {
        form.setFieldsValue({
          ID_Team: task.ID_Team,
          ID_Order: task.ID_Order,
          Employees: task.Employees.map((emp) => ({
            value: emp.ID_Employee,
            label: `${emp.Full_Name} — ${emp.Position}`,
          })),
          Task_Name: task.Task_Name,
          Description: task.Description,
          Deadline: task.Deadline ? dayjs(task.Deadline) : null,
          Time_Norm: task.Time_Norm ?? 1,
          ID_Manager: task.Employees[0]?.ID_Manager,
        });
      }, 0);

      setEditingTaskId(task.ID_Task);
      setIsModalVisible(true);
    } catch (error) {
      console.error("Ошибка при открытии задачи для редактирования:", error);
      messageApi.error("Не удалось открыть задачу для редактирования");
    }
  };

  const closeModal = () => {
    form.resetFields();
    setEditingTaskId(null);
    setIsModalVisible(false);
  };

  const handleFinish = async (values: CreateTaskFormValues) => {
    try {
      if (editingTaskId) {
        // режим редактирования
        const updatedTaskPayload = {
          ...values,
          Deadline: values.Deadline
            ? dayjs(values.Deadline).toISOString()
            : null,
        };
        await fetch(`${API_URL}/api/tasks/${editingTaskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTaskPayload),
        });
        messageApi.success("Задача успешно обновлена");
      } else {
        const parentTaskPayload = {
          Task_Name: values.Task_Name,
          Description: values.Description,
          Deadline: values.Deadline
            ? dayjs(values.Deadline).toISOString()
            : null,
          ID_Team: values.ID_Team,
          ID_Order: values.ID_Order,
          Time_Norm: values.Time_Norm,
          ID_Manager: values.ID_Manager,
          Employee_Names: values.Employees.map((id) => {
            const emp = filteredEmployees.find((e) => e.ID_Employee === id);
            return emp ? emp.Full_Name : null;
          }).filter((name) => name !== null),
        };

        await fetch(`${API_URL}/api/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parentTaskPayload),
        });
        messageApi.success("Задача успешно создана");
      }

      setIsModalVisible(false);
      setEditingTaskId(null);
      await loadTasks();
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при сохранении задачи");
    }
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/tasks`);
      const data: RawTask[] = await response.json();

      const normalized = data.map((task: RawTask) => ({
        ...task,
        Employees: task.Employees.map((emp: RawEmployee) => ({
          ID_Employee: emp.ID_Employee ?? 0,
          ID_User: emp.ID_User ?? 0,
          Full_Name: emp.Employee_Name ?? emp.Full_Name ?? "Без имени",
          Position: emp.Position ?? "Без должности",
          Avatar: emp.Avatar ?? null,
        })),
      }));

      setTasks(normalized);
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

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

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

  const getAssignedEmployeeName = (task: Task) => {
    if (!task || !task.Employees) return "Не назначено";
  
    const assignedId = Number(task.Assigned_Employee_Id);
  
    const assigned = task.Employees.find(
      (emp) =>
        Number(emp.ID_Employee) === assignedId ||
        Number(emp.ID_User) === assignedId
    );
  
    return assigned?.Full_Name || "Не назначено";
  };
  
  
  const handleTeamChange = (teamId?: number) => {
    form.setFieldValue("ID_Team", teamId);
    form.setFieldValue("ID_Order", undefined);
    form.setFieldValue("Employees", []);

    if (teamId) {
      loadProjectsAndEmployees(teamId);
    } else {
      setFilteredProjects(allProjects);
      setFilteredEmployees([]);
    }
  };

  const handleProjectChange = async (projectId: number) => {
    const project = filteredProjects.find((p) => p.ID_Order === projectId);
    if (project) {
      try {
        const response = await fetch(`${API_URL}/api/projects/${projectId}`);
        const projectData = await response.json();
        form.setFieldValue("ID_Manager", projectData.ID_Manager);
      } catch (err) {
        console.error("Ошибка при получении проекта:", err);
      }
    }
  };

  useEffect(() => {
    // Очистить задачи без исполнителя на сервере
    const deleteUnassigned = async () => {
      try {
        await fetch(`${API_URL}/api/tasks/unassigned`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Ошибка при удалении задач без исполнителя:", err);
      }
    };

    deleteUnassigned();
    loadTasks();
  }, [loadTasks]);

  const projectsWithTasks = Array.from(
    new Set(tasks.map((task) => task.ID_Order))
  );

  const filteredTasks = tasks
    .filter((task) => task.Status_Name !== "Архив")
    .filter((task) => task.Assigned_Employee_Id)
    .filter((task) => {
      const query = searchQuery.toLowerCase().trim();
      return (
        !query ||
        task.Task_Name.toLowerCase().includes(query) ||
        task.Description.toLowerCase().includes(query) ||
        task.Order_Name.toLowerCase().includes(query)
      );
    })
    .filter((task) =>
      filters.name
        ? task.Task_Name.toLowerCase().includes(filters.name.toLowerCase())
        : true
    )
    .filter((task) => {
      if (filters.projectId) {
        return task.ID_Order === filters.projectId;
      }

      if (filters.teamId) {
        const projectExistsInFiltered = filteredProjects.some(
          (p) => p.ID_Order === task.ID_Order
        );
        const projectHasTasks = projectsWithTasks.includes(task.ID_Order);
        return projectExistsInFiltered && projectHasTasks;
      }

      return projectsWithTasks.includes(task.ID_Order);
    });

  const STATUS_MAP: Record<string, number> = {
    Новая: 1,
    "В работе": 2,
    Завершена: 3,
    Выполнена: 4,
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId.replace("task-", ""), 10);
    const sourceStatusName = source.droppableId;
    const targetStatusName = destination.droppableId;

    // 🔒 Блокируем перенос из "Выполнена" во все остальные статусы
    if (sourceStatusName === "Выполнена" && targetStatusName !== "Выполнена") {
      messageApi.warning(
        "Нельзя перемещать задачу из статуса 'Выполнена' обратно в другие статусы."
      );
      return;
    }

    const isFinalStatus = ["Завершена", "Выполнена"].includes(targetStatusName);
    const isSourceFinal = ["Завершена", "Выполнена"].includes(sourceStatusName);

    // 🔒 Блокируем перенос обратно из финального статуса
    if (isSourceFinal && !isFinalStatus) {
      messageApi.warning(
        "Нельзя перемещать задачу обратно из финального статуса."
      );
      return;
    }

    if (isFinalStatus) {
      setConfirmationModal({
        visible: true,
        taskId,
        targetStatus: targetStatusName,
      });
    } else {
      await updateTaskStatus(taskId, targetStatusName);
    }
  };

  const updateTaskStatus = async (taskId: number, targetStatusName: string) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`);
      if (!response.ok) throw new Error("Ошибка при получении задачи");
      const taskData = await response.json();

      // Используем внешнюю STATUS_MAP
      const statusId = STATUS_MAP[targetStatusName];

      const updatedTask = {
        ...taskData,
        ID_Status: statusId,
      };

      const updateResponse = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });

      if (!updateResponse.ok) throw new Error("Ошибка при обновлении задачи");

      messageApi.success(`Статус задачи обновлён на "${targetStatusName}"`);
      await loadTasks();
    } catch (error) {
      console.error("Ошибка при изменении статуса задачи:", error);
      messageApi.error("Не удалось обновить статус задачи");
    }
  };

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
    const diffDays = end.diff(now, "day");
    const diffMinutes = end.diff(now, "minute");
  
    if (diffDays < 0) {
      return { label: "Просрочено", color: "#f44336" }; // красный
    } else if (diffDays < 1) {
      // Меньше суток
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return {
        label: `${hours} ч. ${minutes} мин.`,
        color: "#ff9800", // жёлтый
      };
    } else if (diffDays <= 3) {
      return { label: `${diffDays} дн.`, color: "#ff9800" }; // жёлтый
    } else {
      return { label: `${diffDays} дн.`, color: "#4caf50" }; // зелёный
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
          <Button
            icon={<FilterOutlined />}
            onClick={() => setIsFilterModalVisible(true)}
            style={{ backgroundColor: "#1f1f1f", color: "#f0f0f0" }}
          >
            Фильтры
          </Button>
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
  <i>Данный модуль выполняет:</i> {getAssignedEmployeeName(task)}
</p>

                                {(() => {
                                  const assignedUserId =
                                    task.Assigned_Employee_Id;
                                  // Фильтруем всех сотрудников кроме главного исполнителя
                                  const otherEmployees = (
                                    task.AlsoAssignedEmployees || []
                                  ).filter(
                                    (emp) => emp.ID_User !== assignedUserId
                                  );

                                  return otherEmployees.length > 0 ? (
                                    <div
                                      className="kanban-avatars-row"
                                      style={{
                                        display: "flex",
                                        justifyContent: "flex-start",
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
                                          minWidth: "160px",
                                        }}
                                      >
                                        Задача назначена также:
                                      </span>
                                      <div
                                        className="kanban-avatars"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        {otherEmployees.map((emp, idx) => (
                                          <div
                                            key={emp.ID_User}
                                            title={emp.EmployeeName}
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
                                                alt={emp.EmployeeName}
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
                                                {emp.EmployeeName.split(" ")
                                                  .map((n: string) => n[0])
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
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}
  >
    <Button
      type="link"
      icon={<EyeOutlined />}
      size="small"
      style={{ padding: 0 }}
      onClick={() => loadTaskDetails(task.ID_Task)}
    />
    <Button
      type="link"
      icon={<MessageOutlined />}
      size="small"
      style={{ padding: 0 }}
    />
  </div>

  <div
  style={{
    backgroundColor: ["Выполнена", "Завершена"].includes(task.Status_Name)
      ? "transparent"
      : deadlineInfo?.color,
    color: ["Выполнена", "Завершена"].includes(task.Status_Name)
      ? "#ccc" // можно выбрать любой цвет для текста
      : "#fff",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "12px",
    minWidth: "80px",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    border: ["Выполнена", "Завершена"].includes(task.Status_Name)
      ? "1px solid #ccc"
      : "none",
  }}
>
  {["Выполнена", "Завершена"].includes(task.Status_Name) && (
    <ClockCircleOutlined />
  )}
  {deadlineInfo?.label}
</div>

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

  const columns: ColumnsType<Task> = [
    {
      title: "Проект",
      dataIndex: "Order_Name",
      key: "Order_Name",
      align: "left",
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: "Название задачи",
      dataIndex: "Task_Name",
      key: "Task_Name",
      align: "left",
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: "Описание",
      dataIndex: "Description",
      key: "Description",
      align: "left",
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: "Сотрудник",
      dataIndex: "Assigned_Employee_Id",
      key: "Assigned_Employee_Id",
      align: "left",
      render: (_, record) => {
        const assignedEmployee = record.Employees.find(
          (emp) => emp.ID_Employee === record.Assigned_Employee_Id
        );
        return (
          <span
            style={{ fontStyle: "italic", cursor: "pointer" }}
            onClick={() => navigate(`/employee/${record.Assigned_Employee_Id}`)}
          >
            {assignedEmployee ? assignedEmployee.Full_Name : "Не назначено"}
          </span>
        );
      },
    },
    {
      title: "Статус",
      dataIndex: "Status_Name",
      key: "Status_Name",
      align: "center",
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: "Дедлайн",
      dataIndex: "Deadline",
      key: "Deadline",
      align: "center",
      render: (date: string) => (
        <span>
          {date ? dayjs(date).format("DD.MM.YYYY HH:mm") : "Без срока"}
        </span>
      ),
    },
    {
      title: "Действия",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              // Логика открытия модалки для редактирования задачи
              // Например:
              openEditModal(record);
            }}
          />
          <Button
            type="link"
            icon={<InboxOutlined />}
            onClick={() => {
              // Логика архивирования задачи
              archiveTask(record.ID_Task);
            }}
          />
        </div>
      ),
    },
  ];

  const renderTaskTable = () => (
    <>
      <div
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
          <Button
            icon={<FilterOutlined />}
            onClick={() => setIsFilterModalVisible(true)}
            style={{ backgroundColor: "#1f1f1f", color: "#f0f0f0" }}
          >
            Фильтры
          </Button>
          <Button icon={<DownloadOutlined />}>Экспорт</Button>
        </div>
      </div>

      <Table
        dataSource={filteredTasks}
        columns={columns}
        rowKey="ID_Task"
        pagination={{ pageSize: 10 }}
        bordered
        style={{ backgroundColor: "#2a2a2a" }}
      />
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
                      children: renderTaskTable(),
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
              <Select
                mode="multiple"
                labelInValue
                placeholder="Выберите участников"
                optionLabelProp="label"
              >
                {filteredEmployees.map((emp) => (
                  <Select.Option
                    key={emp.ID_Employee}
                    value={emp.ID_Employee}
                    label={`${emp.Full_Name} — ${emp.Position}`}
                  >
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
                    const projectEnd = dayjs(selectedProject.End_Date).endOf(
                      "day"
                    );
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
        <Modal
          title="Фильтры задач"
          open={isFilterModalVisible}
          onCancel={() => setIsFilterModalVisible(false)}
          onOk={() => setIsFilterModalVisible(false)}
          okText="Применить"
          cancelText="Отмена"
        >
          <Form layout="vertical">
            <Form.Item label="Команда">
              <Select
                allowClear
                value={filters.teamId}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, teamId: value }))
                }
                placeholder="Выберите команду"
              >
                {teams.map((team) => (
                  <Select.Option key={team.ID_Team} value={team.ID_Team}>
                    {team.Team_Name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="Проект">
              <Select
                allowClear
                value={filters.projectId}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, projectId: value }))
                }
                placeholder="Выберите проект"
              >
                {allProjects
                  .filter((project) =>
                    filters.teamId ? project.ID_Team === filters.teamId : true
                  )
                  .map((project) => (
                    <Select.Option
                      key={project.ID_Order}
                      value={project.ID_Order}
                    >
                      {project.Order_Name}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
            <Form.Item label="Название задачи">
              <Select
                allowClear
                showSearch
                value={filters.name}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, name: value }))
                }
                placeholder="Выберите задачу"
              >
                {taskNames.map((taskName) => (
                  <Select.Option key={taskName} value={taskName}>
                    {taskName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          open={confirmationModal?.visible}
          title={`Перевести задачу в статус "${confirmationModal?.targetStatus}"?`}
          onCancel={() => setConfirmationModal(null)}
          onOk={async () => {
            if (confirmationModal?.taskId && confirmationModal?.targetStatus) {
              await updateTaskStatus(
                confirmationModal.taskId,
                confirmationModal.targetStatus
              );
              setConfirmationModal(null);
            }
          }}
          okText="Да, подтвердить"
          cancelText="Отмена"
        >
          {confirmationModal?.targetStatus === "Выполнена" ? (
            <p style={{ marginBottom: 0, color: "#f5222d" }}>
              ⚠️ После перевода задачи в статус "Выполнена" задачу нельзя будет
              вернуть обратно в другие статусы ("Новая", "В работе",
              "Завершена").
            </p>
          ) : (
            <p style={{ marginBottom: 0 }}>
              После перевода задачи в этот статус задача не сможет быть
              возвращена в статусы "Новая" или "В работе".
            </p>
          )}
        </Modal>
        <Modal
          title="Детали задачи"
          open={isDetailsModalVisible}
          onCancel={() => setIsDetailsModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailsModalVisible(false)}>
              Закрыть
            </Button>,
          ]}
        >
          {taskDetails ? (
            <>
              <p>
                <strong>Название:</strong> {taskDetails.Task_Name}
              </p>
              <p>
                <strong>Описание:</strong> {taskDetails.Description}
              </p>
              <p>
                <strong>Норма времени:</strong> {taskDetails.Time_Norm} ч.
              </p>
              <p>
                <strong>Дедлайн:</strong>{" "}
                {taskDetails.Deadline
                  ? dayjs(taskDetails.Deadline).format("DD.MM.YYYY HH:mm")
                  : "Без срока"}
              </p>
              <p>
                <strong>Статус:</strong> {taskDetails.Status_Name}
              </p>
              <p>
                <strong>Проект:</strong> {taskDetails.Order_Name}
              </p>
              <p>
                <strong>Команда:</strong> {taskDetails.Team_Name}
              </p>

              <p>
                
  <strong>Данный модуль выполняет:</strong>{" "}
  {taskDetails.Employees.find(
    (emp) =>
      emp.ID_Employee === Number(taskDetails.Assigned_Employee_Id) ||
      emp.ID_User === Number(taskDetails.Assigned_Employee_Id)
  )?.Full_Name || "Не назначено"}
</p>


            </>
          ) : (
            <Loader />
          )}
        </Modal>
      </App>
    </ConfigProvider>
  );
};

export default ManagerDashboard;
