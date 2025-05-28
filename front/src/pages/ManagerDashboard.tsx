import React, { useEffect, useState, useCallback, useMemo } from "react";

import {
  App,
  Button,
  ConfigProvider,
  Form,
  Input,
  Modal,
  Select,
  Table,
  Tooltip,
  message,
  theme,
  Avatar,
  Tabs,
  DatePicker,
  InputNumber,
  Upload,
} from "antd";

import {
  UserOutlined,
  EyeOutlined,
  EditOutlined,
  UploadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { UpOutlined, DownOutlined } from "@ant-design/icons";
import { PlusOutlined } from "@ant-design/icons";
import { ClockCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { MessageOutlined } from "@ant-design/icons";
import { InboxOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import HeaderManager from "../components/HeaderManager";
import SidebarManager from "../components/SidebarManager";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import "../styles/pages/ManagerDashboard.css";
import "@ant-design/v5-patch-for-react-19";
import type { UploadFile } from "antd/es/upload";
import { Dropdown } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined } from "@ant-design/icons";
const { Option } = Select;
const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isCyclic(obj: unknown): boolean {
  const seenObjects = new WeakSet();

  function detect(value: unknown): boolean {
    if (value && typeof value === "object") {
      if (seenObjects.has(value)) {
        return true;
      }
      seenObjects.add(value);
      for (const key in value as Record<string, unknown>) {
        if (
          Object.prototype.hasOwnProperty.call(value, key) &&
          detect((value as Record<string, unknown>)[key])
        ) {
          return true;
        }
      }
    }
    return false;
  }

  return detect(obj);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function stringifyCircularJSON(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, function (key, value) {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return;
      seen.add(value);
    }
    return value;
  });
}


interface Comment {
  id: number;
  author: string;
  content: string;
  datetime: string;
}

interface Task {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Time_Norm: number;
  Status_Name: string;
  Order_Name: string;
  ID_Order: number;
  Team_Name?: string;
  Deadline?: string | null;
  Employees: {
    id: number;
    fullName: string;
    avatar?: string | null;
  }[];
  attachments?: string[];
  comments?: Comment[];
  AutoCompleted?: boolean;
  Status_Updated_At?: string;
  EmployeeId?: number; // Добавлено
  EmployeeName?: string; // Добавлено
  EmployeeAvatar?: string | null; // Добавлено
}

interface Team {
  ID_Team: number;
  Team_Name: string;
  members: TeamMember[];
  Status?: string; // добавить это
  IsArchived?: boolean; // уже есть
}

interface TeamMember {
  id: number;
  fullName: string;
  avatar?: string;
  role?: string;
}

interface Status {
  ID_Status: number;
  Status_Name: string;
}

interface Project {
  ID_Order: number;
  Order_Name: string;
  ID_Team: number;
  ID_Manager: number;
  IsArchived?: boolean;
  Deadline?: string | null;
}
interface RawMember {
  ID_User: number;
  First_Name: string;
  Last_Name: string;
  Role?: string;
  Avatar?: string;
}

interface RawTeam {
  ID_Team: number;
  Team_Name: string;
  members: RawMember[];
}


const statuses = ["Новая", "В работе", "Завершена", "Выполнена"];

const ManagerDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [statusesData, setStatusesData] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, projectsRes, statusesRes, tasksRes] = await Promise.all([
          fetch(`${API_URL}/api/teams`),
          fetch(`${API_URL}/api/projects`),
          fetch(`${API_URL}/api/statuses`),
          fetch(`${API_URL}/api/tasks`),
        ]);
  
        const [teamsData, projectsData, statusesData, tasksData] = await Promise.all([
          teamsRes.json(),
          projectsRes.json(),
          statusesRes.json(),
          tasksRes.json(),
        ]);
  
        const processedTeams = (teamsData as RawTeam[]).map((team) => ({
          ...team,
          members: team.members.map((m) => ({
            id: m.ID_User,
            fullName: `${m.First_Name} ${m.Last_Name}`,
            role: m.Role,
            avatar: m.Avatar,
          })),
        }));
        
  
        setTeams(processedTeams);
        setProjects(projectsData);
        setStatusesData(statusesData);
        setTasks(tasksData);
      } catch (error) {
        console.error("Ошибка при загрузке данных:", error);
        messageApi.error("Ошибка при загрузке данных");
      }
    };
  
    fetchData();
  }, []);
  
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("kanban");
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedStatuses, setExpandedStatuses] = useState<string[]>([]);
  const [pendingDragTask, setPendingDragTask] = useState<{
    taskId: number;
    targetStatusId: number;
    targetStatusName: string;
  } | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [confirmCloseVisible, setConfirmCloseVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [projectDeadline, setProjectDeadline] = useState<dayjs.Dayjs | null>(
    null
  );
  const handleProjectChange = (orderId: number) => {
    form.setFieldValue("ID_Order", orderId);
    const selectedProject = filteredProjects.find(
      (p) => p.ID_Order === orderId
    );

    console.log("Выбранный проект:", selectedProject); // ✅ ЛОГ ДЛЯ ОТЛАДКИ

    setProjectDeadline(
      selectedProject?.Deadline ? dayjs(selectedProject.Deadline) : null
    );
  };

  const renderEmployees = (
    employees: { id: number; fullName: string; avatar?: string | null }[]
  ) => {
    if (!employees?.length) return "—";
    return (
      <Avatar.Group max={{ count: 3 }}>
        {employees.map((emp) => (
          <Tooltip key={emp.id} title={emp.fullName}>
            <Avatar
              src={emp.avatar ? `${API_URL}/uploads/${emp.avatar}` : undefined}
              style={{
                backgroundColor: emp.avatar ? "transparent" : "#777",
                cursor: "pointer",
              }}
              onClick={() => navigate(`/employee/${emp.id}`)}
            >
              {!emp.avatar && getInitials(emp.fullName)}
            </Avatar>
          </Tooltip>
        ))}
      </Avatar.Group>
    );
  };
  const navigate = useNavigate();

  const [selectedFiles, setSelectedFiles] = useState<UploadFile<File>[]>([]);
  const [filterTeam, setFilterTeam] = useState<number | null>(null);
  const [filterProject, setFilterProject] = useState<number | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);
  const [comments, setComments] = useState<
    {
      ID_Comment: number;
      CommentText: string;
      Created_At: string;
      AuthorName: string;
      ID_User: number;
      Avatar?: string;
    }[]
  >([]);

  const handleCloseTask = (taskId: number) => {
    setSelectedTaskId(taskId);
    setConfirmCloseVisible(true);
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const token = localStorage.getItem("token");

      // 1. Удаление комментариев задачи
      const commentsRes = await fetch(
        `${API_URL}/api/comments/task/${taskId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!commentsRes.ok) {
        const errorText = await commentsRes.text();
        throw new Error(`Ошибка удаления комментариев: ${errorText}`);
      }

      // 2. Удаление записей выполнения (Execution)
      const executionRes = await fetch(
        `${API_URL}/api/executions/task/${taskId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!executionRes.ok) {
        const errorText = await executionRes.text();
        throw new Error(`Ошибка удаления записей выполнения: ${errorText}`);
      }

      // 3. Удаление самой задачи
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Ошибка удаления задачи: ${errorText}`);
      }

      messageApi.success("Задача и все её связанные данные удалены");
      fetchAll();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
        messageApi.error(error.message);
      } else {
        messageApi.error("Неизвестная ошибка при удалении задачи");
      }
    }
  };

  const handleCloseTaskConfirmed = async () => {
    if (!selectedTaskId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/tasks/${selectedTaskId}/close`,
        {
          // <<<<< тут исправлено
          method: "PATCH",
        }
      );

      if (!response.ok) throw new Error("Ошибка при закрытии задачи");

      messageApi.success("Задача успешно закрыта");

      setActiveTab("table");
      setShowArchive(true); // Переключаемся на архивный вид
      fetchAll();
    } catch (error: unknown) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      }
    } finally {
      setConfirmCloseVisible(false);
      setSelectedTaskId(null);
    }
  };
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);

  const [newComment, setNewComment] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id ?? null;

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editedCommentText, setEditedCommentText] = useState("");

  const handleExport = async (format: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/export/tasks?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "*/*",
        },
      });

      if (!res.ok) throw new Error("Ошибка при экспорте");

      const blob = await res.blob();

      // Извлекаем имя файла из заголовков
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `tasks_export.${format === "word" ? "docx" : format}`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: unknown) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      } else {
        messageApi.error("Неизвестная ошибка при экспорте данных");
      }
    }
  };

  const openCommentsModal = async (taskId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/comments/${taskId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : data.comments ?? []);
      setCurrentTaskId(taskId);
      setIsCommentsModalVisible(true);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        messageApi.error(err.message);
      } else {
        messageApi.error("Ошибка при загрузке комментариев");
      }
    }
  };

  const submitComment = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    const userId = user?.id ?? null;

    if (!newComment.trim()) {
      messageApi.error("Комментарий не может быть пустым");
      return;
    }

    if (!currentTaskId) {
      messageApi.error("ID задачи не определён");
      return;
    }

    if (!userId || userId <= 0) {
      messageApi.error("ID пользователя отсутствует или некорректен");
      return;
    }

    if (!token) {
      messageApi.error(
        "Токен авторизации отсутствует. Пожалуйста, войдите заново."
      );
      return;
    }

    const payload = {
      taskId: currentTaskId,
      userId,
      commentText: newComment.trim(),
    };

    try {
      const res = await fetch(`${API_URL}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorMessage = await res.text();
        throw new Error(`Ошибка: ${res.status} — ${errorMessage}`);
      }

      setNewComment("");
      openCommentsModal(currentTaskId);
      messageApi.success("Комментарий добавлен");
    } catch (err) {
      messageApi.error("Ошибка при отправке комментария");
      console.error("submitComment error:", err);
    }
  };

  const clearFilters = () => {
    setFilterTeam(null);
    setFilterProject(null);
    setFilterEmployee(null);
  };

  const filterMenu = (
    <div style={{ padding: 8, minWidth: 200, maxWidth: 220 }}>
      <Select
        allowClear
        showSearch
        placeholder="Фильтр по сотруднику"
        style={{ width: "100%", marginBottom: 8 }}
        onChange={(val) => setFilterEmployee(val)}
        value={filterEmployee ?? undefined}
        optionFilterProp="children"
      >
        {[
          ...new Set(
            tasks.flatMap(
              (task) => task.Employees?.map((emp) => emp.fullName) || []
            )
          ),
        ]
          .sort()
          .map((name) => (
            <Option key={name} value={name}>
              {name}
            </Option>
          ))}
      </Select>

      <Select
        allowClear
        placeholder="Фильтр по проекту"
        style={{ width: "100%", marginBottom: 8 }}
        onChange={(val) => setFilterProject(val)}
        value={filterProject ?? undefined}
      >
        {projects.map((proj) => (
          <Option key={proj.ID_Order} value={proj.ID_Order}>
            {proj.Order_Name}
          </Option>
        ))}
      </Select>

      <Select
        value="По дате"
        style={{ width: "100%", marginBottom: 8 }}
        dropdownRender={() => (
          <div style={{ padding: 8 }}>
            <Button
              icon={<UpOutlined />}
              type={sortOrder === "asc" ? "primary" : "default"}
              onClick={() => setSortOrder("asc")}
              size="small"
              style={{ width: "100%", marginBottom: 4 }}
            >
              По возрастанию
            </Button>
            <Button
              icon={<DownOutlined />}
              type={sortOrder === "desc" ? "primary" : "default"}
              onClick={() => setSortOrder("desc")}
              size="small"
              style={{ width: "100%" }}
            >
              По убыванию
            </Button>
          </div>
        )}
      >
        <Option value="По дате">По дате</Option>
      </Select>

      <Button
        onClick={clearFilters}
        style={{
          width: "100%",
          fontSize: "12px",
          padding: "4px 0",
          marginTop: 4,
          backgroundColor: "#f5f5f5",
          color: "#000",
          border: "1px solid #ccc",
        }}
      >
        Сбросить фильтры
      </Button>
    </div>
  );

  const getInitials = (fullName: string) => {
    const [first, second] = fullName.split(" ");
    return `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewingTask?.ID_Task) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("taskId", viewingTask.ID_Task.toString());

    setSelectedFileName(file.name); // ✅ Добавлено

    try {
      const response = await fetch("http://localhost:3002/api/upload-task", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Ошибка загрузки");

      const data = await response.json();
      alert("Файл загружен: " + data.filename);
    } catch (err) {
      console.error("Ошибка загрузки файла:", err);
      alert("Ошибка загрузки файла");
    }
  };

  const tableColumns: ColumnsType<Task> = [
    {
      title: "Проект",
      dataIndex: "Order_Name",
      key: "Order_Name",
      align: "center",
      filters: Array.from(new Set(tasks.map((task) => task.Order_Name))).map(
        (name) => ({ text: name, value: name })
      ),
      onFilter: (value, record) =>
        typeof value === "string" && record.Order_Name === value,
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: "Название задачи",
      dataIndex: "Task_Name",
      key: "Task_Name",
      align: "center",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: "Описание",
      dataIndex: "Description",
      key: "Description",
      align: "center",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: "Норма времени (часы)",
      dataIndex: "Time_Norm",
      key: "Time_Norm",
      align: "center",
      render: (text: number) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: "Дедлайн",
      dataIndex: "Deadline",
      key: "Deadline",
      align: "center",
      render: (date: string) => (
        <div style={{ textAlign: "left" }}>
          {date ? dayjs(date).format("YYYY-MM-DD HH:mm") : "—"}
        </div>
      ),
    },
    {
      title: "Сотрудники",
      key: "Employees",
      align: "center",
      render: (_: unknown, task: Task) => (
        <div style={{ textAlign: "left" }}>
          {task.Employees.map((emp, idx) => (
            <span key={emp.id}>
              <a
                href={`/employee/${emp.id}`}
                style={{ color: "inherit", textDecoration: "underline" }}
              >
                {emp.fullName}
              </a>
              {idx < task.Employees.length - 1 && ", "}
            </span>
          ))}
        </div>
      ),
    },

    {
      title: "Статус",
      dataIndex: "Status_Name",
      key: "Status_Name",
      align: "center",
      filters: Array.from(new Set(tasks.map((task) => task.Status_Name))).map(
        (status) => ({ text: status, value: status })
      ),
      onFilter: (value, record) =>
        typeof value === "string" && record.Status_Name === value,
      render: (_: unknown, task: Task) => (
        <div style={{ textAlign: "left" }}>
          {task.Status_Name}
          {task.Status_Name === "Завершена" && task.AutoCompleted && (
            <span style={{ color: "orange", marginLeft: 6 }}>(Просрочено)</span>
          )}
        </div>
      ),
    },

    {
      title: "Действия",
      key: "actions",
      align: "center",
      render: (_: unknown, task: Task) => (
        <div className="task-actions" style={{ textAlign: "left" }}>
          {showArchive ? (
            <Tooltip title="Удалить задачу">
              <Button
                icon={
                  <DeleteOutlined
                    style={{ display: "flex", justifyContent: "center" }}
                  />
                }
                danger
                onClick={() => {
                  setSelectedTaskId(task.ID_Task);
                  setIsDeleteConfirmVisible(true);
                }}
                size="small"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "inherit",
                  padding: 0,
                }}
              />
            </Tooltip>
          ) : (
            <>
              <Tooltip title="Редактировать">
                <Button
                  icon={<EditOutlined />}
                  onClick={() => showModal(task)}
                  size="small"
                  style={{
                    marginRight: 8,
                    backgroundColor: "transparent",
                    border: "none",
                    color: "inherit",
                    padding: 0,
                  }}
                />
              </Tooltip>
              <Tooltip title="Закрыть задачу">
                <Button
                  icon={<InboxOutlined />}
                  onClick={() => handleCloseTask(task.ID_Task)}
                  size="small"
                  danger
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "inherit",
                    padding: 0,
                  }}
                />
              </Tooltip>
            </>
          )}
        </div>
      ),
    },
  ];

  const fetchAll = useCallback(async () => {
    try {
      const [resTasks, resTeams, resStatuses, resProjects] = await Promise.all([
        fetch(`${API_URL}/api/taskdetails/with-details`),
        fetch(`${API_URL}/api/teams`),
        fetch(`${API_URL}/api/statuses`),
        fetch(`${API_URL}/api/projects`),
      ]);

      const [rawTasks, teamsData, statusesDataRaw, projectsData] =
        await Promise.all([
          resTasks.json(),
          resTeams.json(),
          resStatuses.json(),
          resProjects.json(),
        ]);

      type RawEmployee = {
        ID_Employee?: number;
        id?: number;
        Full_Name?: string;
        fullName?: string;
        Avatar?: string | null;
        avatar?: string | null;
      };

      type RawTask = Omit<Task, "Employees"> & {
        Employees?: RawEmployee[];
      };

      const normalizedTasks: Task[] = (rawTasks as RawTask[]).map((task) => {
        const employees: Task["Employees"] = (task.Employees || []).map((emp) => ({
          id: emp.ID_Employee ?? emp.id ?? 0,
          fullName: emp.Full_Name ?? emp.fullName ?? "Без имени",
          avatar: emp.Avatar ?? emp.avatar ?? null,
        }));
      
        return {
          ...task,
          ID_Task: Number(task.ID_Task),
          Employees: employees.length ? employees : [], // ✅ Сохраняем пустой массив, если нет
          EmployeeId: employees[0]?.id ?? null,
          EmployeeName: employees[0]?.fullName ?? "",
          EmployeeAvatar: employees[0]?.avatar ?? null,
        };
      });
      

      setTasks(
        normalizedTasks.map((task) => {
          if (!task.Employees?.length && task.EmployeeId && task.EmployeeName) {
            return {
              ...task,
              Employees: [
                {
                  id: task.EmployeeId,
                  fullName: task.EmployeeName,
                  avatar: task.EmployeeAvatar ?? null,
                },
              ],
            };
          }
          return task;
        })
      );

      setTeams(teamsData.filter((team: Team) => !team.IsArchived));

      setStatusesData(statusesDataRaw);
      setProjects(projectsData);
    } catch (err) {
      console.error("Ошибка при fetchAll:", err);
      messageApi.error("Ошибка при загрузке данных");
    }
  }, [messageApi]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const autoUpdateOverdueTasks = async () => {
      const overdueTasks = tasks.filter(
        (task) =>
          task.Deadline &&
          dayjs(task.Deadline).isBefore(dayjs()) &&
          (task.Status_Name === "Новая" || task.Status_Name === "В работе")
      );

      if (overdueTasks.length === 0) return;

      const completedStatus = statusesData.find(
        (s) => s.Status_Name === "Завершена"
      );
      if (!completedStatus) return;

      for (const task of overdueTasks) {
        try {
          const res = await fetch(`${API_URL}/api/tasks/${task.ID_Task}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ID_Status: completedStatus.ID_Status }),
          });
          if (!res.ok) throw new Error();
        } catch (err) {
          console.error(
            `Ошибка при авто-завершении задачи ID ${task.ID_Task}:`,
            err
          );
        }
      }

      fetchAll();
    };

    autoUpdateOverdueTasks();
  }, [tasks, statusesData, fetchAll]);

  const filteredTasks = useMemo(() => {
    const oneWeekAgo = dayjs().subtract(7, "day");

    const filtered = tasks.filter((task) => {
      const dateToCompare = task.Status_Updated_At
        ? dayjs(task.Status_Updated_At)
        : task.Deadline
        ? dayjs(task.Deadline)
        : null;

      const isOlderThanWeek =
        dateToCompare && dateToCompare.isBefore(oneWeekAgo);

      const isVisible = showArchive
        ? ["Завершена", "Выполнена"].includes(task.Status_Name)
        : !["Завершена", "Выполнена"].includes(task.Status_Name) ||
          !isOlderThanWeek;

      const matchesTeam =
        !filterTeam ||
        teams.find((t) => t.Team_Name === task.Team_Name)?.ID_Team ===
          filterTeam;
      const matchesProject = !filterProject || task.ID_Order === filterProject;
      const matchesEmployee =
        !filterEmployee ||
        task.Employees.some((emp) => emp.fullName === filterEmployee);
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        task.Task_Name.toLowerCase().includes(query) ||
        task.Description.toLowerCase().includes(query) ||
        task.Order_Name.toLowerCase().includes(query) ||
        task.Employees.some((emp) =>
          emp.fullName.toLowerCase().includes(query)
        );

      return (
        isVisible &&
        matchesTeam &&
        matchesProject &&
        matchesEmployee &&
        matchesSearch
      );
    });
    console.log(
      "🔍 После фильтрации:",
      filtered.map((t) => t.ID_Task)
    );

    return filtered.sort((a, b) => {
      const dateA = dayjs(a.Status_Updated_At || a.Deadline || "").valueOf();
      const dateB = dayjs(b.Status_Updated_At || b.Deadline || "").valueOf();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [
    tasks,
    filterTeam,
    filterProject,
    filterEmployee,
    teams,
    searchQuery,
    showArchive,
    sortOrder,
  ]);

  const filteredGroupedMap: Record<string, Task[]> = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach((task) => {
      if (!map[task.Status_Name]) {
        map[task.Status_Name] = [];
      }
      map[task.Status_Name].push(task);
    });
    return map;
  }, [filteredTasks]);

  const collapsedTasks = useMemo(() => {
    const taskMap = new Map<number, Task>();
    for (const task of filteredTasks) {
      if (!taskMap.has(task.ID_Task)) {
        taskMap.set(task.ID_Task, task);
      }
    }
    return Array.from(taskMap.values());
  }, [filteredTasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId.split("-")[1], 10);
    const task = tasks.find((t) => t.ID_Task === taskId);
    if (!task) return;

    const fromStatus = source.droppableId;
    const toStatus = destination.droppableId;

    // ❌ Запрет: Из "Выполнена" нельзя двигать никуда
    if (fromStatus === "Выполнена") {
      messageApi.warning('Перемещение из "Выполнена" запрещено');
      return;
    }

    // ❌ Запрет: Из "Завершена" можно только в "Выполнена"
    if (fromStatus === "Завершена" && toStatus !== "Выполнена") {
      messageApi.warning(
        'Из "Завершена" можно перемещать только в "Выполнено"'
      );
      return;
    }

    const statusObj = statusesData.find((s) => s.Status_Name === toStatus);
    if (!statusObj) return;

    const isGoingToFinalStatus =
      toStatus === "Завершена" || toStatus === "Выполнена";
    const isFromInitialStatus =
      fromStatus === "Новая" || fromStatus === "В работе";

    if (
      isGoingToFinalStatus &&
      (isFromInitialStatus || fromStatus === "Завершена")
    ) {
      setPendingDragTask({
        taskId: task.ID_Task,
        targetStatusId: statusObj.ID_Status,
        targetStatusName: toStatus,
      });
      setIsConfirmModalVisible(true);
    } else {
      if (!task.EmployeeId) {
        messageApi.error("Не удалось определить сотрудника для задачи");
        return;
      }
      await updateTaskStatus(
        task.ID_Task,
        task.EmployeeId,
        statusObj.ID_Status
      );
    }
  };

  const updateTaskStatus = async (
    taskId: number,
    employeeId: number,
    statusId: number
  ) => {
    const updatedAt = new Date().toISOString();

    try {
      await fetch(`${API_URL}/api/tasks/${taskId}/update-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          statusName: statusesData.find((s) => s.ID_Status === statusId)
            ?.Status_Name,
        }),
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.ID_Task === taskId && t.EmployeeId === employeeId
            ? {
                ...t,
                Status_Name:
                  statusesData.find((s) => s.ID_Status === statusId)
                    ?.Status_Name || t.Status_Name,
                Status_Updated_At: updatedAt,
              }
            : t
        )
      );

      fetchAll();
    } catch {
      messageApi.error("Ошибка при изменении статуса");
    }
  };

  const showModal = (task?: Task) => {
    setEditingTask(task || null);
    setIsModalVisible(true);

    if (task) {
      const team = teams.find((t) => t.Team_Name === task.Team_Name) || {
        ID_Team: -1,
        Team_Name: task.Team_Name || "Удалённая команда",
        members: [],
        IsArchived: true,
      };

      setSelectedTeamId(team?.ID_Team || null);
      setFilteredProjects(
        projects.filter(
          (proj) =>
            proj.ID_Team === team?.ID_Team &&
            !proj.IsArchived &&
            (!proj.Deadline || dayjs(proj.Deadline).isAfter(dayjs()))
        )
      );

      // Фильтруем только активные команды (Status !== "Архив")
      const activeTeams = editingTask
        ? teams
        : teams.filter((t) => t.Status !== "Архив");
      setTeams(activeTeams);

      setSelectedMembers(task.Employees.map((e) => e.id));

      form.setFieldsValue({
        Task_Name: task.Task_Name,
        Description: task.Description,
        ID_Status: statusesData.find((s) => s.Status_Name === task.Status_Name)
          ?.ID_Status,
        ID_Order: task.ID_Order,
        Time_Norm: task.Time_Norm,
        Deadline: task.Deadline ? dayjs(task.Deadline) : null,
      });

      if (task.attachments?.length) {
        setSelectedFiles(
          task.attachments.map((filename, idx) => ({
            uid: `existing-${idx}`,
            name: filename,
            status: "done",
            url: `${API_URL}/uploads/${filename}`,
            originFileObj: undefined, // 👈 ДОБАВЬ ЭТО
          }))
        );
      } else {
        setSelectedFiles([]);
      }
    } else {
      form.resetFields();
      setSelectedTeamId(null);
      setFilteredProjects([]);
      setSelectedMembers([]);
      setSelectedFiles([]); // сбрасываем
    }
  };

  const handleFinish = async (values: {
    Task_Name: string;
    Description: string;
    ID_Order: number;
    Time_Norm: number;
    Deadline?: dayjs.Dayjs;
  }) => {
    console.log("🐞 selectedMembers:", selectedMembers); // ← ВОТ СЮДА
  
    const selectedIds: number[] = Array.isArray(selectedMembers)
      ? selectedMembers
          .map((id) => Number(id))
          .filter((id): id is number => !isNaN(id) && id > 0)
      : [];
  
    if (selectedIds.length === 0) {
      messageApi.error("Не выбраны сотрудники для задачи");
      return;
    }
  
  
    // ✅ Проверка на дублирование задачи
    const trimmedName = values.Task_Name.trim().toLowerCase();
    const isDuplicate = tasks.some(
      (task) =>
        task.Task_Name.trim().toLowerCase() === trimmedName &&
        (!editingTask || task.ID_Task !== editingTask.ID_Task)
    );
  
    if (isDuplicate) {
      messageApi.error("Задача с таким названием уже существует");
      return;
    }
  
    // ✅ Загрузка прикреплённых файлов
    const uploadedFilenames: string[] = [];
    for (const file of selectedFiles) {
      if (file.originFileObj) {
        const formData = new FormData();
        formData.append("file", file.originFileObj);
        if (editingTask?.ID_Task) {
          formData.append("taskId", editingTask.ID_Task.toString());
        }
  
        try {
          const res = await fetch(`${API_URL}/api/upload-task`, {
            method: "POST",
            body: formData,
          });
  
          if (res.ok) {
            const data = await res.json();
            uploadedFilenames.push(data.filename);
          } else {
            messageApi.error(`Ошибка при загрузке файла: ${file.name}`);
          }
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Сетевая ошибка при загрузке";
          messageApi.error(`Ошибка при загрузке файла: ${file.name} — ${msg}`);
        }
      } else if (file.url) {
        uploadedFilenames.push(file.name);
      }
    }
  
    const newStatus = statusesData.find((s) => s.Status_Name === "Новая");
    if (!newStatus) {
      messageApi.error('Не найден статус "Новая"');
      return;
    }
  
    const selectedOrderId = Number(values.ID_Order);
    const selectedProject = projects.find(
      (p) => Number(p.ID_Order) === selectedOrderId
    );
  
    if (selectedProject && !selectedProject.ID_Manager) {
      selectedProject.ID_Manager = JSON.parse(
        localStorage.getItem("user") || "{}"
      )?.id;
    }
  
    if (!selectedProject || !selectedProject.ID_Manager) {
      messageApi.error("Не удалось определить ID менеджера проекта");
      return;
    }
    const payload = {
      Task_Name: values.Task_Name,
      Description: values.Description,
      ID_Order: selectedOrderId,
      ID_Status: newStatus.ID_Status,
      Time_Norm: values.Time_Norm,
      Deadline: values.Deadline ? dayjs(values.Deadline).toISOString() : null,
      EmployeeIds: selectedIds,
      attachments: uploadedFilenames,
      ID_Manager: selectedProject?.ID_Manager ?? null, // только число, не объект!
    };
    
  
    try {
      const url = editingTask
        ? `${API_URL}/api/tasks/${editingTask.ID_Task}`
        : `${API_URL}/api/tasks`;
      const method = editingTask ? "PUT" : "POST";
    
      console.log("📦 Финальный payload перед отправкой:", payload); // ✅ ВНЕ fetch
    
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // ❗ без stringifyCircularJSON
      });
    
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка при создании задачи: ${errorText}`);
      }
    
      messageApi.success(editingTask ? "Задача обновлена" : "Задача создана");
      setIsModalVisible(false);
      fetchAll(); // Перезагрузка данных
    } catch (error) {
      if (error instanceof Error) {
        messageApi.error("Ошибка при сохранении задачи: " + error.message);
      } else {
        messageApi.error("Неизвестная ошибка при сохранении задачи");
      }
    }
    
  };
  

  const handleTeamChange = (teamId: number) => {
    console.log("Все проекты:", projects); // ✅ ЛОГ 1
    console.log("Фильтрация для команды ID:", teamId); // ✅ ЛОГ 2

    const activeProjects = projects.filter(
      (proj) =>
        proj.ID_Team === teamId &&
        !proj.IsArchived &&
        (!proj.Deadline || dayjs(proj.Deadline).isAfter(dayjs()))
    );

    console.log("Фильтрованные проекты:", activeProjects); // ✅ ЛОГ 3

    setSelectedTeamId(teamId);
    const foundTeam = teams.find((t) => t.ID_Team === teamId);
    console.log("✅ Члены выбранной команды:", foundTeam?.members);

    setSelectedMembers([]);
    setFilteredProjects(activeProjects);
    form.setFieldsValue({ ID_Order: undefined });

    const team = teams.find((t) => t.ID_Team === teamId);
    console.log(
      "Members for selected team:",
      team?.members?.map((m) => ({ id: m.id, name: m.fullName }))
    );
  };

  const openViewModal = (task: Task) => {
    setViewingTask(task);
    setIsViewModalVisible(true);
  };
  const handleEditComment = async (commentId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      messageApi.error(
        "Токен авторизации отсутствует. Пожалуйста, войдите заново."
      );
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ commentText: editedCommentText }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Ошибка: ${res.status} — ${errorText}`);
      }

      setEditingCommentId(null);
      openCommentsModal(currentTaskId!);
      messageApi.success("Комментарий обновлён");
    } catch (error) {
      console.error("Ошибка при обновлении комментария:", error);
      messageApi.error("Ошибка при обновлении комментария");
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await fetch(`${API_URL}/api/comments/${commentId}`, { method: "DELETE" });
      messageApi.success("Комментарий удалён");
      openCommentsModal(currentTaskId!);
    } catch {
      messageApi.error("Ошибка при удалении комментария");
    }
  };

  const renderDeadlineBox = (task: Task) => {
    const deadline = task.Deadline ? dayjs(task.Deadline) : null;
    const now = dayjs();

    // 🔴 1. Завершена (автоматически или вручную)
    if (task.Status_Name === "Завершена") {
      return (
        <div
          style={{
            marginTop: 8,
            fontSize: "13px",
            color: task.AutoCompleted ? "red" : "#aaa",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ClockCircleOutlined />
          {task.AutoCompleted ? "Срок истёк" : "Завершено"}
        </div>
      );
    }

    // ✅ 2. Выполнена (перетащена вручную)
    if (task.Status_Name === "Выполнена") {
      return (
        <div
          style={{
            marginTop: 8,
            fontSize: "13px",
            color: "#aaa",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ClockCircleOutlined />
          Выполнено
        </div>
      );
    }

    // ⚪ 3. Без срока
    if (!deadline) {
      return (
        <div
          style={{
            marginTop: 8,
            fontSize: "13px",
            color: "#aaa",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ClockCircleOutlined />
          Дедлайн: без срока
        </div>
      );
    }

    // ⏰ 4. Срок есть — считаем цвет
    const isExpired = deadline.isBefore(now);
    const isUrgent = deadline.diff(now, "hour") <= 24;

    let color = "#52c41a"; // 🟢 по умолчанию
    if (isExpired) color = "red"; // 🔴 просрочено
    else if (isUrgent) color = "#faad14"; // 🟡 приближается

    return (
      <div
        style={{
          marginTop: 8,
          fontSize: "13px",
          color,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <ClockCircleOutlined />
        Дедлайн: {deadline.format("YYYY-MM-DD HH:mm")}
      </div>
    );
  };

  const renderEmployeeTasks = (task: Task) => {
    return (
      <div>
        {task.Employees.map((employee) => (
          <div key={employee.id} className="task-card">
            <h3>{task.Task_Name}</h3>
            <p>{task.Description}</p>
            <p>Ответственный: {employee.fullName}</p>
            <div className="status-container">
              {/* Кнопка для перемещения статуса задачи */}
              <button
                onClick={() =>
                  handleTaskDrag(task.ID_Task, employee.id, "новый статус")
                }
              >
                Переместить
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  <div>{tasks.map((task) => renderEmployeeTasks(task))}</div>;
  const handleTaskDrag = async (
    taskId: number,
    employeeId: number,
    statusName: string
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/update-status`, {
        method: "PUT",
        body: JSON.stringify({
          employeeId,
          statusName,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        // Обновление локального состояния задач
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.ID_Task === taskId
              ? {
                  ...task,
                  Employees: task.Employees.map((emp) =>
                    emp.id === employeeId ? { ...emp, status: statusName } : emp
                  ),
                }
              : task
          )
        );
      }
    } catch (error) {
      console.error("Ошибка при изменении статуса задачи:", error);
    }
  };

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <App>
        {contextHolder}
        <div className="dashboard">
          <HeaderManager />
          <div className="dashboard-body">
            <SidebarManager />
            <main className="main-content">
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  marginBottom: "24px",
                }}
              >
                Доски задач
              </h1>

              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                items={[
                  {
                    label: "Kanban-доска",
                    key: "kanban",
                    children: (
                      <>
                        <div
                          className="sticky-toolbar"
                          style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 10,
                            padding: "8px 0",
                            backgroundColor: "transparent",
                            borderBottom: "none",
                            boxShadow: "none",
                            marginBottom: "16px", // ✅ ВОТ ЭТА СТРОКА — ДОБАВЬ ЕЁ
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <Button
                              className="add-task-button"
                              onClick={() => showModal()}
                              icon={<PlusOutlined />}
                            >
                              Добавить задачу
                            </Button>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <Button
                                onClick={() => setShowArchive(!showArchive)}
                                icon={<InboxOutlined />}
                              >
                                {showArchive
                                  ? "Назад к задачам"
                                  : "Архив задач"}
                              </Button>

                              <Input
                                placeholder="Поиск по карточкам задач..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ minWidth: 250 }}
                              />

                              <Dropdown
                                menu={{ items: [] }}
                                open={isDropdownOpen}
                                onOpenChange={setIsDropdownOpen}
                                dropdownRender={() => filterMenu}
                              >
                                <Button
                                  className="filters-button"
                                  icon={<FilterOutlined />}
                                >
                                  Фильтры
                                </Button>
                              </Dropdown>

                              <Dropdown
                                menu={{
                                  onClick: ({ key }) => handleExport(key),
                                  items: [
                                    {
                                      key: "word",
                                      label: "Экспорт в Word (.docx)",
                                    },
                                    {
                                      key: "excel",
                                      label: "Экспорт в Excel (.xlsx)",
                                    },
                                    {
                                      key: "pdf",
                                      label: "Экспорт в PDF (.pdf)",
                                    },
                                  ],
                                }}
                                placement="bottomRight"
                                arrow
                              >
                                <Button icon={<DownloadOutlined />}>
                                  Экспорт
                                </Button>
                              </Dropdown>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            maxHeight: "calc(100vh - 250px)",
                            overflowY: "auto",
                            overflowX: "auto",
                          }}
                        >
                          <DragDropContext onDragEnd={handleDragEnd}>
                            <div
                              style={{
                                maxHeight: "calc(100vh - 250px)",
                                overflowY: "auto",
                                overflowX: "auto",
                              }}
                            >
                              {/* Заголовки статусов */}
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: `repeat(${statuses.length}, minmax(300px, 1fr))`,
                                  gap: "16px",
                                  marginBottom: "12px",
                                  paddingInline: "4px",
                                }}
                              >
                                {statuses.map((status) => (
                                  <div
                                    key={`status-title-${status}`}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      position: "relative",
                                      backgroundColor: "var(--card-bg-color)",
                                      padding: "10px 12px",
                                      borderRadius: "8px",
                                      boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                                      textTransform: "uppercase",
                                      fontSize: "15px",
                                      fontWeight: 400,
                                      color: "var(--text-color)",

                                      minHeight: "40px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        position: "absolute",
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: "5px",
                                        borderTopLeftRadius: "8px",
                                        borderBottomLeftRadius: "8px",
                                        backgroundColor: "#00bcd4",
                                      }}
                                    />
                                    {status.toUpperCase()}
                                  </div>
                                ))}
                              </div>

                              {/* Колонки с задачами */}
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: `repeat(${statuses.length}, minmax(300px, 1fr))`,
                                  gap: "16px",
                                  paddingInline: "4px",
                                }}
                              >
                                {statuses.map((status) => {
                                  const tasksForStatus =
                                    filteredGroupedMap[status] || [];
                                  const isExpanded =
                                    expandedStatuses.includes(status);
                                  const visibleTasks = isExpanded
                                    ? tasksForStatus
                                    : tasksForStatus.slice(0, 5);

                                  return (
                                    <Droppable
                                      key={status}
                                      droppableId={status}
                                    >
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.droppableProps}
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "16px",
                                            minWidth: "300px",
                                            backgroundColor:
                                              "var(--card-bg-color)",
                                            borderRadius: "10px",
                                            padding: "1rem",
                                            boxShadow:
                                              "0 4px 12px rgba(0, 0, 0, 0.2)",
                                          }}
                                        >
                                          {visibleTasks.map((task, index) => (
                                            <Draggable
                                              key={`task-${task.ID_Task}`}
                                              draggableId={`task-${task.ID_Task}`}
                                              index={index}
                                            >
                                              {(providedDraggable) => (
                                                <div
                                                  className="kanban-task"
                                                  ref={
                                                    providedDraggable.innerRef
                                                  }
                                                  {...providedDraggable.draggableProps}
                                                  {...providedDraggable.dragHandleProps}
                                                >
                                                  <div className="kanban-task-content">
                                                    <strong>
                                                      {task.Task_Name}
                                                    </strong>
                                                    <p>{task.Description}</p>
                                                    <p
                                                      style={{
                                                        fontWeight: "bold",
                                                        fontStyle: "italic",
                                                        fontSize: "14px",
                                                        textDecoration:
                                                          "underline",
                                                        textDecorationColor:
                                                          "#00bcd4",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                      }}
                                                    >
                                                      Назначено для:{" "}
                                                      {task.Employees.map(
                                                        (e) => e.fullName
                                                      ).join(", ")}
                                                    </p>
                                                    <p>
                                                      <i>Проект:</i>{" "}
                                                      {task.Order_Name}
                                                    </p>

                                                    <div className="kanban-avatars">
                                                      {renderEmployees(
                                                        task.Employees
                                                      )}
                                                    </div>

                                                    {/* ✅ ВСТАВЛЕН БЛОК С ДЕДЛАЙНОМ */}
                                                    {renderDeadlineBox(task)}

                                                    <div className="task-footer">
                                                      <Button
                                                        type="text"
                                                        icon={<EyeOutlined />}
                                                        onClick={() =>
                                                          openViewModal(task)
                                                        }
                                                        style={{
                                                          padding: 0,
                                                          height: "auto",
                                                          marginRight: 8,
                                                        }}
                                                      />
                                                      <Button
                                                        type="text"
                                                        icon={
                                                          <MessageOutlined />
                                                        }
                                                        onClick={() =>
                                                          openCommentsModal(
                                                            task.ID_Task
                                                          )
                                                        }
                                                        style={{
                                                          padding: 0,
                                                          height: "auto",
                                                        }}
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </Draggable>
                                          ))}

                                          {tasksForStatus.length > 5 &&
                                            !isExpanded && (
                                              <Button
                                                type="link"
                                                onClick={() =>
                                                  setExpandedStatuses([
                                                    ...expandedStatuses,
                                                    status,
                                                  ])
                                                }
                                                style={{
                                                  alignSelf: "center",
                                                  marginTop: 8,
                                                  color: "#00bcd4",
                                                }}
                                              >
                                                Смотреть далее (
                                                {tasksForStatus.length - 5} ещё)
                                              </Button>
                                            )}

                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>
                                  );
                                })}
                              </div>
                            </div>
                          </DragDropContext>
                        </div>
                      </>
                    ),
                  },
                  {
                    label: "Журнал задач",
                    key: "table",
                    children: (
                      <>
                        <div
                          style={{
                            maxHeight: "calc(100vh - 200px)",
                            overflowY: "auto",
                          }}
                        >
                          <div
                            className="sticky-toolbar"
                            style={{ borderBottom: "none", boxShadow: "none" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 8,
                              }}
                            >
                              <Button
                                className="add-task-button"
                                onClick={() => showModal()}
                                icon={<PlusOutlined />}
                              >
                                Добавить задачу
                              </Button>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <Button
                                  onClick={() => setShowArchive(!showArchive)}
                                >
                                  {showArchive
                                    ? "Назад к списку задач"
                                    : "Перейти в архив"}
                                </Button>

                                <Input
                                  placeholder="Поиск по таблице задач..."
                                  value={searchQuery}
                                  onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                  }
                                  style={{ minWidth: 250 }}
                                />

                                <Dropdown
                                  open={isDropdownOpen}
                                  onOpenChange={setIsDropdownOpen}
                                  dropdownRender={() => filterMenu}
                                >
                                  <Button
                                    className="filters-button"
                                    icon={<FilterOutlined />}
                                  >
                                    Фильтры
                                  </Button>
                                </Dropdown>

                                <Dropdown
                                  menu={{
                                    onClick: ({ key }) => handleExport(key),
                                    items: [
                                      {
                                        key: "word",
                                        label: "Экспорт в Word (.docx)",
                                      },
                                      {
                                        key: "excel",
                                        label: "Экспорт в Excel (.xlsx)",
                                      },
                                      {
                                        key: "pdf",
                                        label: "Экспорт в PDF (.pdf)",
                                      },
                                    ],
                                  }}
                                  placement="bottomRight"
                                  arrow
                                >
                                  <Button icon={<DownloadOutlined />}>
                                    Экспорт
                                  </Button>
                                </Dropdown>
                              </div>
                            </div>
                          </div>

                          <h2 style={{ marginTop: "16px" }}>
                            {showArchive ? "Архив задач" : "Активные задачи"}
                          </h2>

                          <Table
                            dataSource={collapsedTasks}
                            columns={tableColumns}
                            rowKey="ID_Task"
                            pagination={{ pageSize: 10 }}
                          />
                        </div>
                      </>
                    ),
                  },
                ]}
              />
              {/* Модальное окно редактирования или создания задачи */}
              <Modal
                title={editingTask ? "Редактировать задачу" : "Создать задачу"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
              >
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                  <Form.Item label="Команда" required>
                    <Select
                      placeholder="Выберите команду"
                      onChange={handleTeamChange}
                      value={selectedTeamId ?? undefined}
                    >
                      {teams
                        .filter(
                          (team) =>
                            team.Status !== "Архив" ||
                            team.ID_Team === selectedTeamId
                        )
                        .map((team) => (
                          <Option
                            key={`team-${team.ID_Team}`}
                            value={team.ID_Team}
                          >
                            {team.Team_Name}
                            {team.Status === "Архив" ? " (архив)" : ""}
                          </Option>
                        ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="ID_Order"
                    label="Проект"
                    rules={[{ required: true }]}
                  >
                    <Select
                      placeholder="Выберите проект"
                      onChange={handleProjectChange}
                    >
                      {filteredProjects.map((proj) => (
                        <Option key={proj.ID_Order} value={proj.ID_Order}>
                          {proj.Order_Name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item label="Исполнители">
                    <Select
                      mode="multiple"
                      placeholder="Выберите участников"
                      value={selectedMembers}
                      onChange={(vals: number[]) => {
                        console.log("🎯 Выбранные ID исполнителей:", vals); // ✅ Логируем выбранных сотрудников
                        setSelectedMembers(vals);
                      }}
                      disabled={!selectedTeamId}
                    >
                      {(
                        teams.find((t) => t.ID_Team === selectedTeamId)
                          ?.members || []
                      ).map((member, index) => (
                        <Option key={index} value={member.id}>
                          {member.fullName}
                          {member.role
                            ? ` — ${member.role}`
                            : " — [должность не указана]"}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="Task_Name"
                    label="Название задачи"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="Description"
                    label="Описание"
                    rules={[{ required: true }]}
                  >
                    <Input.TextArea />
                  </Form.Item>
                  <Form.Item
                    name="Deadline"
                    label="Дедлайн"
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();

                          const nowPlus12Hours = dayjs().add(12, "hour");
                          if (value.isBefore(nowPlus12Hours)) {
                            return Promise.reject(
                              "Минимальный срок — через 12 часов"
                            );
                          }

                          const selectedOrderId =
                            form.getFieldValue("ID_Order");
                          const selectedProject = filteredProjects.find(
                            (p) => p.ID_Order === selectedOrderId
                          );

                          if (selectedProject?.Deadline) {
                            const projectDeadline = dayjs(
                              selectedProject.Deadline
                            ).subtract(12, "hour");
                            if (value.isAfter(projectDeadline)) {
                              return Promise.reject(
                                `Максимальный срок — за 12 часов до ${dayjs(
                                  selectedProject.Deadline
                                ).format("YYYY-MM-DD HH:mm")}`
                              );
                            }
                          }

                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      showTime
                      showNow={false}
                      disabledDate={(current) => {
                        const nowPlus12Hours = dayjs().add(12, "hour");

                        if (!current) return false;

                        const isBeforeMin = current.isBefore(
                          nowPlus12Hours,
                          "minute"
                        );
                        let isAfterMax = false;

                        if (projectDeadline) {
                          const projectDeadlineLimit = projectDeadline.subtract(
                            12,
                            "hour"
                          );
                          isAfterMax = current.isAfter(
                            projectDeadlineLimit,
                            "minute"
                          );
                        }

                        return isBeforeMin || isAfterMax;
                      }}
                      placeholder="Выберите дату и время"
                    />
                  </Form.Item>

                  <Form.Item
                    name="Time_Norm"
                    label="Норма времени (часы)"
                    rules={[{ required: true }]}
                  >
                    <InputNumber style={{ width: "100%" }} min={0} step={0.5} />
                  </Form.Item>
                  <Form.Item label="Прикрепить файлы">
                    <Upload
                      multiple
                      beforeUpload={() => false}
                      fileList={selectedFiles}
                      onChange={({ fileList }) => {
                        setSelectedFiles(
                          fileList.map((file) => ({
                            ...file,
                            originFileObj: file.originFileObj ?? undefined,
                          }))
                        );
                      }}
                      onRemove={(file) => {
                        setSelectedFiles((prev) =>
                          prev.filter((f) => f.uid !== file.uid)
                        );
                        return false;
                      }}
                    >
                      <Button
                        icon={<UploadOutlined />}
                        className="upload-btn-dark"
                      >
                        Выберите файлы
                      </Button>
                    </Upload>
                  </Form.Item>
                </Form>
              </Modal>

              {/* Модальное окно просмотра задачи */}
              <Modal
                title="Информация о задаче"
                open={isViewModalVisible}
                onCancel={() => setIsViewModalVisible(false)}
                footer={[
                  <Button
                    key="edit"
                    onClick={() => {
                      if (viewingTask) showModal(viewingTask);
                      setIsViewModalVisible(false);
                    }}
                  >
                    Редактировать
                  </Button>,
                  <Button
                    key="close"
                    onClick={() => setIsViewModalVisible(false)}
                  >
                    Закрыть
                  </Button>,
                ]}
              >
                {viewingTask && (
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    <p>
                      <strong>Название:</strong> {viewingTask.Task_Name}
                    </p>
                    <p>
                      <strong>Описание:</strong> {viewingTask.Description}
                    </p>
                    <p>
                      <strong>Проект:</strong> {viewingTask.Order_Name}
                    </p>
                    <p>
                      <strong>Команда:</strong> {viewingTask.Team_Name || "—"}
                    </p>
                    <p>
                      <strong>Статус:</strong> {viewingTask.Status_Name}
                    </p>
                    <p>
                      <strong>Дедлайн:</strong>{" "}
                      {viewingTask.Deadline
                        ? dayjs(viewingTask.Deadline).format("YYYY-MM-DD HH:mm")
                        : "—"}
                    </p>
                    <p>
                      <strong>Норма времени:</strong> {viewingTask.Time_Norm} ч.
                    </p>

                    <p>
                      <strong>Сотрудники:</strong>
                    </p>
                    <div className="kanban-avatars">
                      {viewingTask.Employees.map((emp, idx) => (
                        <Tooltip
                          key={`emp-view-${emp.id}-${idx}`}
                          title={emp.fullName}
                        >
                          <Avatar
                            src={
                              emp.avatar
                                ? `${API_URL}/uploads/${emp.avatar}`
                                : undefined
                            }
                            icon={!emp.avatar ? <UserOutlined /> : undefined}
                            style={{
                              backgroundColor: emp.avatar
                                ? "transparent"
                                : "#777",
                              marginRight: 4,
                            }}
                          >
                            {!emp.avatar && getInitials(emp.fullName)}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </div>

                    {viewingTask.attachments &&
                      viewingTask.attachments.length > 0 && (
                        <>
                          <p>
                            <strong>Файлы:</strong>
                          </p>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            {viewingTask.attachments.map((filename, idx) => (
                              <a
                                key={`att-view-${idx}`}
                                href={`${API_URL}/uploads/${filename}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-block",
                                  backgroundColor: "#2a2a2a",
                                  color: "#fff",
                                  textDecoration: "none",
                                  padding: "4px 8px",
                                  borderRadius: 4,
                                  fontSize: 12,
                                }}
                              >
                                📎 {filename}
                              </a>
                            ))}
                          </div>
                        </>
                      )}

                    {/* ✅ ВСТАВЬ ЭТО */}
                    <p>
                      <strong>Загрузить новый файл:</strong>
                    </p>
                    <input type="file" onChange={handleFileUpload} />
                    {selectedFileName && (
                      <div
                        style={{
                          marginTop: "8px",
                          fontSize: "13px",
                          color: "#aaa",
                        }}
                      >
                        🗂 Загружено: <strong>{selectedFileName}</strong>
                      </div>
                    )}
                  </div>
                )}
              </Modal>

              <Modal
                title="Комментарии к задаче"
                open={isCommentsModalVisible}
                onCancel={() => {
                  setIsCommentsModalVisible(false);
                  setEditingCommentId(null);
                }}
                footer={null}
              >
                <div
                  style={{
                    maxHeight: 300,
                    overflowY: "auto",
                    marginBottom: 16,
                  }}
                >
                  {comments.length ? (
                    comments.map((c) => (
                      <div
                        key={c.ID_Comment}
                        style={{
                          marginBottom: 12,
                          paddingBottom: 8,
                          borderBottom: "1px solid #333",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <Avatar
                            src={
                              c.Avatar
                                ? `${API_URL}/uploads/${c.Avatar}`
                                : undefined
                            }
                            style={{ marginRight: 8 }}
                          />
                          <strong>{c.AuthorName}</strong>
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: 12,
                              color: "#aaa",
                            }}
                          >
                            {dayjs(c.Created_At).format("YYYY-MM-DD HH:mm")}
                          </span>
                        </div>

                        {editingCommentId === c.ID_Comment ? (
                          <>
                            <Input.TextArea
                              value={editedCommentText}
                              onChange={(e) =>
                                setEditedCommentText(e.target.value)
                              }
                              autoSize
                            />
                            <div style={{ marginTop: 4, textAlign: "right" }}>
                              <Button
                                onClick={() => setEditingCommentId(null)}
                                style={{ marginRight: 8 }}
                              >
                                Отмена
                              </Button>
                              <Button
                                type="primary"
                                onClick={() => handleEditComment(c.ID_Comment)}
                              >
                                Сохранить
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div style={{ paddingLeft: 32 }}>{c.CommentText}</div>
                        )}

                        {c.ID_User === userId &&
                          editingCommentId !== c.ID_Comment && (
                            <div className="comment-action-buttons">
                              <Button
                                size="small"
                                onClick={() => {
                                  setEditingCommentId(c.ID_Comment);
                                  setEditedCommentText(c.CommentText);
                                }}
                              >
                                Редактировать
                              </Button>
                              <Button
                                size="small"
                                onClick={() =>
                                  handleDeleteComment(c.ID_Comment)
                                }
                              >
                                Удалить
                              </Button>
                            </div>
                          )}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "#aaa" }}>Комментариев пока нет.</p>
                  )}
                </div>

                <Input.TextArea
                  placeholder="Введите комментарий..."
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button
                  type="primary"
                  onClick={submitComment}
                  style={{ marginTop: 8 }}
                  block
                >
                  Отправить
                </Button>
              </Modal>

              <Modal
                title="Подтвердите действие"
                open={isConfirmModalVisible}
                onOk={async () => {
                  if (pendingDragTask) {
                    const draggedTask = tasks.find(
                      (t) => t.ID_Task === pendingDragTask.taskId
                    );
                    if (draggedTask?.EmployeeId != null) {
                      await updateTaskStatus(
                        pendingDragTask.taskId,
                        draggedTask.EmployeeId,
                        pendingDragTask.targetStatusId
                      );
                    }

                    setPendingDragTask(null);
                  }
                  setIsConfirmModalVisible(false);
                }}
                onCancel={() => {
                  setPendingDragTask(null);
                  setIsConfirmModalVisible(false);
                }}
              >
                <p>
                  Вы уверены, что хотите переместить задачу в статус «
                  {pendingDragTask?.targetStatusName}»?
                </p>
                {pendingDragTask?.targetStatusName === "Выполнена" &&
                  pendingDragTask &&
                  tasks.find((t) => t.ID_Task === pendingDragTask.taskId)
                    ?.Status_Name === "Завершена" && (
                    <p style={{ color: "#f5222d", marginTop: "8px" }}>
                      После перетаскивания карточки в данный статус, действие
                      нельзя будет отменить!
                    </p>
                  )}
              </Modal>

              <Modal
                title="Подтверждение"
                open={confirmCloseVisible}
                onOk={handleCloseTaskConfirmed}
                onCancel={() => setConfirmCloseVisible(false)}
                okText="Да, закрыть задачу"
                cancelText="Отмена"
              >
                <p>Вы уверены, что хотите закрыть эту задачу?</p>
              </Modal>
              <Modal
                title="Подтверждение удаления"
                open={isDeleteConfirmVisible}
                onOk={() => {
                  if (selectedTaskId !== null) handleDeleteTask(selectedTaskId);
                  setIsDeleteConfirmVisible(false);
                }}
                onCancel={() => setIsDeleteConfirmVisible(false)}
                okText="Удалить"
                cancelText="Отмена"
              >
                <p>
                  Вы уверены, что хотите безвозвратно удалить эту задачу и все
                  связанные данные?
                </p>
              </Modal>
            </main>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default ManagerDashboard;
