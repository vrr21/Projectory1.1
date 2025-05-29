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
  ClockCircleOutlined,
  UploadOutlined,
  FilterOutlined,
} from "@ant-design/icons";

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
import { useNavigate } from "react-router-dom";

const { Option } = Select;
const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

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
  IsArchived?: boolean; // добавлено
  Deadline?: string | null; // добавлено
}

const statuses = ["Новая", "В работе", "Завершена", "Выполнена"];

const ManagerDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [statusesData, setStatusesData] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("kanban");
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedStatuses, setExpandedStatuses] = useState<string[]>([]);
  const [pendingDragTask, setPendingDragTask] = useState<{
    taskId: number;
    targetStatusId: number;
    targetStatusName: string;
  } | null>(null);
  const navigate = useNavigate();
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
    setProjectDeadline(
      selectedProject?.Deadline ? dayjs(selectedProject.Deadline) : null
    );
  };

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
      messageApi.error("Ошибка при загрузке комментариев");
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
      render: (text: number) => (
        <div style={{ textAlign: "center" }}>{text}</div>
      ),
    },
    {
      title: "Дедлайн",
      dataIndex: "Deadline",
      key: "Deadline",
      align: "center",
      render: (date: string) => (
        <div style={{ textAlign: "center" }}>
          {date ? dayjs(date).format("DD.MM.YYYY HH:mm") : "—"}
        </div>
      ),
    },
    {
      title: "Сотрудник",
      dataIndex: "EmployeeName",
      key: "EmployeeName",
      align: "center",
      render: (_: string, record: Task) => (
        <span
          style={{ fontStyle: "italic", color: "#bbb", cursor: "pointer" }}
          onClick={() => navigate(`/employee/${record.EmployeeId}`)}
        >
          {record.EmployeeName}
        </span>
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
      render: (text: string) => (
        <div style={{ textAlign: "center" }}>{text}</div>
      ),
    },
    {
      title: "Действия",
      key: "actions",
      align: "center",
      render: (_: unknown, task: Task) => (
        <div
          className="task-actions"
          style={{ display: "flex", justifyContent: "center", gap: 8 }}
        >
          {showArchive ? (
            <Tooltip title="Удалить задачу">
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleDeleteTask(task.ID_Task)}
                size="small"
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "inherit",
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
                    backgroundColor: "transparent",
                    border: "none",
                    color: "inherit",
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
      const [tasksData, teamsData, statusesDataRaw, projectsData] =
        await Promise.all([
          resTasks.json(),
          resTeams.json(),
          resStatuses.json(),
          resProjects.json(),
        ]);
      console.log(
        "Fetched raw teams with members:",
        JSON.stringify(teamsData, null, 2)
      );

      const completedStatusId = statusesDataRaw.find(
        (s: Status) => s.Status_Name === "Завершена"
      )?.ID_Status;

      const updatedTasks: Task[] = [];
      for (const task of tasksData) {
        const team = teamsData.find(
          (team: Team) => team.Team_Name === task.Team_Name
        );
        const allMembersRemoved =
          !team ||
          !team.members.some((member: TeamMember) =>
            task.Employees.some((emp: { id: number }) => emp.id === member.id)
          );
        const isInProgress =
          task.Status_Name === "Новая" || task.Status_Name === "В работе";

        if (allMembersRemoved && isInProgress && completedStatusId) {
          try {
            const res = await fetch(`${API_URL}/api/tasks/${task.ID_Task}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ID_Status: completedStatusId }),
            });

            if (res.ok) {
              updatedTasks.push({
                ...task,
                Status_Name: "Завершена",
                AutoCompleted: true,
              });
              continue;
            }
          } catch (err) {
            console.error(
              `Ошибка при авто-завершении задачи ID ${task.ID_Task}:`,
              err
            );
          }
        }

        updatedTasks.push(task);
      }
      console.log("Fetched tasks from API:", tasksData);
      console.log("Updated tasks after auto-complete check:", updatedTasks);
      const expandedTasks = updatedTasks.flatMap((task) =>
        task.Employees.map((emp) => ({
          ...task,
          EmployeeId: emp.id,
          EmployeeName: emp.fullName,
          EmployeeAvatar: emp.avatar,
        }))
      );

      setTasks(expandedTasks);

      const activeTeams = teamsData.filter((team: Team) => !team.IsArchived);
      setTeams(activeTeams);

      setStatusesData(statusesDataRaw);
      setProjects(projectsData);
    } catch (err) {
      console.error(err);
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
    return tasks.filter((task) => {
      const isArchivedStatus = ["Завершена", "Выполнена"].includes(
        task.Status_Name
      );
      const statusUpdatedAt = task.Status_Updated_At
        ? dayjs(task.Status_Updated_At)
        : null;
      const oneWeekAgo = dayjs().subtract(7, "day");

      const shouldBeArchived =
        isArchivedStatus &&
        statusUpdatedAt &&
        statusUpdatedAt.isBefore(oneWeekAgo);
      const isInArchiveView = showArchive;
      const isVisible = isInArchiveView ? shouldBeArchived : !shouldBeArchived;

      if (!isVisible) return false;

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

      return matchesTeam && matchesProject && matchesEmployee && matchesSearch;
    });
  }, [
    tasks,
    filterTeam,
    filterProject,
    filterEmployee,
    teams,
    searchQuery,
    showArchive,
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
      await updateTaskStatus(taskId, statusObj.ID_Status);
    }
  };

  const updateTaskStatus = async (taskId: number, statusId: number) => {
    const updatedAt = new Date().toISOString();

    const task = tasks.find((t) => t.ID_Task === taskId); // Добавлено получение задачи
    if (!task) {
      console.error("Задача не найдена для обновления статуса");
      return;
    }

    try {
      await fetch(`${API_URL}/api/tasks/${taskId}/update-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: task.EmployeeId, // Теперь task определён
          statusName: statusesData.find((s) => s.ID_Status === statusId)
            ?.Status_Name,
        }),
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.ID_Task === taskId
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
      const activeTeams = teams.filter((t) => t.Status !== "Архив");
      setTeams(activeTeams);

      setSelectedMembers(task.Employees.map((e) => e.fullName));

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
    if (values.Deadline && dayjs(values.Deadline).isBefore(dayjs(), "day")) {
      messageApi.error("Дедлайн не может быть назначен прошедшей датой!");
      return;
    }

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
        } catch {
          messageApi.error(`Сетевая ошибка при загрузке файла: ${file.name}`);
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

    const payload = {
      ...values,
      ID_Status: newStatus.ID_Status,
      Employee_Names: selectedMembers,
      Deadline: values.Deadline ? dayjs(values.Deadline).toISOString() : null,
      attachments: uploadedFilenames,
    };

    try {
      const url = editingTask
        ? `${API_URL}/api/tasks/${editingTask.ID_Task}`
        : `${API_URL}/api/tasks`;
      const method = editingTask ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      messageApi.success(editingTask ? "Задача обновлена" : "Задача создана");
      setIsModalVisible(false);

      console.log("fetchAll called after creation or update"); // Добавлено сюда
      if (!editingTask) {
        const createdTask = await res.json();
        setTasks((prev) => [
          ...prev,
          { ...createdTask, Employees: createdTask.Employees || [] },
        ]);
      }

      fetchAll(); // Существующий вызов
    } catch {
      messageApi.error("Ошибка при сохранении задачи");
    }
  };

  const handleTeamChange = (teamId: number) => {
    setSelectedTeamId(teamId);
    setSelectedMembers([]);
    const activeProjects = projects.filter(
      (proj) =>
        proj.ID_Team === teamId &&
        !proj.IsArchived &&
        (!proj.Deadline || dayjs(proj.Deadline).isAfter(dayjs()))
    );
    setFilteredProjects(activeProjects);
    form.setFieldsValue({ ID_Order: undefined });

    // 👉 Добавлено для отладки списка участников
    const team = teams.find((t) => t.ID_Team === teamId);
    console.log("Members for selected team:", team?.members);
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
                            >
                              ➕ Добавить задачу
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
                                    { key: "word", label: "Экспорт в Word" },
                                    { key: "excel", label: "Экспорт в Excel" },
                                    { key: "pdf", label: "Экспорт в PDF" },
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
                                display: "grid",
                                gridTemplateColumns: `repeat(${statuses.length}, minmax(300px, 1fr))`,
                                gap: "16px",
                              }}
                            >
                              {statuses.map((status) => (
                                <div
                                  key={`header-${status}`}
                                  className="kanban-status-header"
                                  style={{
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 10,
                                    // ✅ Удалено: border: '1px solid #444',
                                  }}
                                >
                                  {status}
                                </div>
                              ))}

                              {/* Колонки с задачами */}
                              {statuses.map((status) => {
                                const tasksForStatus =
                                  filteredGroupedMap[status] || [];
                                const isExpanded =
                                  expandedStatuses.includes(status);
                                const visibleTasks = isExpanded
                                  ? tasksForStatus
                                  : tasksForStatus.slice(0, 5);

                                return (
                                  <Droppable key={status} droppableId={status}>
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
                                            "var(--card-bg-color)", // ✅ поддержка тем
                                          borderRadius: "10px",
                                          padding: "1rem",
                                          boxShadow:
                                            "0 4px 12px rgba(0, 0, 0, 0.2)", // Оставляем универсальной
                                        }}
                                      >
                                        {visibleTasks.map((task, index) => (
                                          <Draggable
                                            key={`task-${task.ID_Task}-emp-${task.EmployeeId}`}
                                            draggableId={`task-${task.ID_Task}-emp-${task.EmployeeId}`}
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
                                                  <strong>
                                                    {task.Task_Name}
                                                  </strong>
                                                  <p>{task.Description}</p>

                                                  <p>
                                                    <i>
                                                      Модуль задачи назначен:
                                                    </i>{" "}
                                                    {task.EmployeeName}
                                                  </p>

                                                  <p>
                                                    <i>Проект:</i>{" "}
                                                    {task.Order_Name}
                                                  </p>

                                                  {task.Employees &&
                                                    task.Employees.length >
                                                      0 && (
                                                      <>
                                                        <div
                                                          className="task-assignees-row"
                                                          style={{
                                                            display: "flex",
                                                            justifyContent:
                                                              "space-between",
                                                            alignItems:
                                                              "center",
                                                            marginTop: "10px",
                                                          }}
                                                        >
                                                          <span
                                                            style={{
                                                              fontStyle:
                                                                "italic",
                                                              fontSize: "13px",
                                                              color: "#bbb",
                                                            }}
                                                          >
                                                            Задача назначена
                                                            {task.Employees
                                                              .length > 1
                                                              ? " также:"
                                                              : ":"}
                                                          </span>
                                                          <div className="kanban-avatars">
                                                            {task.Employees.map(
                                                              (emp, index) => (
                                                                <Tooltip
                                                                  key={emp.id}
                                                                  title={
                                                                    emp.fullName
                                                                  }
                                                                >
                                                                  <Avatar
                                                                    src={
                                                                      emp.avatar &&
                                                                      emp.avatar !==
                                                                        "null"
                                                                        ? `${API_URL}/uploads/${encodeURIComponent(
                                                                            emp.avatar
                                                                          )}`
                                                                        : undefined
                                                                    }
                                                                    size={32}
                                                                    style={{
                                                                      marginLeft:
                                                                        index ===
                                                                        0
                                                                          ? 0
                                                                          : -10,
                                                                      zIndex:
                                                                        100 -
                                                                        index,
                                                                      border:
                                                                        "2px solid #1f1f1f",
                                                                      cursor:
                                                                        "pointer",
                                                                      backgroundColor:
                                                                        !emp.avatar ||
                                                                        emp.avatar ===
                                                                          "null"
                                                                          ? "#777"
                                                                          : "transparent",
                                                                    }}
                                                                    onClick={() =>
                                                                      navigate(
                                                                        `/employee/${emp.id}`
                                                                      )
                                                                    }
                                                                  >
                                                                    {!emp.avatar ||
                                                                    emp.avatar ===
                                                                      "null"
                                                                      ? emp.fullName
                                                                          .split(
                                                                            " "
                                                                          )
                                                                          .map(
                                                                            (
                                                                              n
                                                                            ) =>
                                                                              n[0]
                                                                          )
                                                                          .slice(
                                                                            0,
                                                                            2
                                                                          )
                                                                          .join(
                                                                            ""
                                                                          )
                                                                          .toUpperCase()
                                                                      : null}
                                                                  </Avatar>
                                                                </Tooltip>
                                                              )
                                                            )}
                                                          </div>
                                                        </div>

                                                        <div
                                                          style={{
                                                            marginTop: "10px",
                                                          }}
                                                        >
                                                          <p
                                                            style={{
                                                              display: "flex",
                                                              alignItems:
                                                                "center",
                                                              gap: "6px",
                                                              fontSize: "13px",
                                                              fontStyle:
                                                                "italic",
                                                              fontWeight: 500,
                                                              color: "#bbb",
                                                            }}
                                                          >
                                                            Дедлайн:
                                                            <span
                                                              style={{
                                                                color:
                                                                  task.Deadline
                                                                    ? dayjs(
                                                                        task.Deadline
                                                                      ).isBefore(
                                                                        dayjs()
                                                                      )
                                                                      ? "#e05252" // тёмно-красный
                                                                      : dayjs(
                                                                          task.Deadline
                                                                        ).diff(
                                                                          dayjs(),
                                                                          "hour"
                                                                        ) <= 24
                                                                      ? "#d4af37" // тёмно-жёлтый
                                                                      : "#3cb371" // тёмно-зелёный
                                                                    : "#999", // приглушённо-серый
                                                                fontWeight:
                                                                  "bold",
                                                              }}
                                                            >
                                                              {task.Deadline
                                                                ? dayjs(
                                                                    task.Deadline
                                                                  ).format(
                                                                    "DD.MM.YYYY HH:mm"
                                                                  )
                                                                : "Не задан"}
                                                            </span>
                                                          </p>
                                                        </div>
                                                      </>
                                                    )}

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
                                                      icon={<MessageOutlined />}
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
                                                    {task.Status_Name ===
                                                      "Завершена" &&
                                                    task.AutoCompleted ? (
                                                      <div className="deadline-box expired">
                                                        <ClockCircleOutlined
                                                          style={{
                                                            marginRight: 6,
                                                          }}
                                                        />
                                                        Срок истёк
                                                      </div>
                                                    ) : task.Status_Name ===
                                                      "Завершена" ? (
                                                      <div className="deadline-box completed">
                                                        <ClockCircleOutlined
                                                          style={{
                                                            marginRight: 6,
                                                          }}
                                                        />
                                                        Завершена
                                                      </div>
                                                    ) : task.Status_Name ===
                                                      "Выполнена" ? (
                                                      <div className="deadline-box completed">
                                                        <ClockCircleOutlined
                                                          style={{
                                                            marginRight: 6,
                                                          }}
                                                        />
                                                        Выполнено
                                                      </div>
                                                    ) : task.Deadline ? (
                                                      <div
                                                        className={`deadline-box ${
                                                          dayjs(
                                                            task.Deadline
                                                          ).isBefore(dayjs())
                                                            ? "expired"
                                                            : dayjs(
                                                                task.Deadline
                                                              ).diff(
                                                                dayjs(),
                                                                "hour"
                                                              ) <= 24
                                                            ? "warning"
                                                            : "safe"
                                                        }`}
                                                      >
                                                        <ClockCircleOutlined
                                                          style={{
                                                            marginRight: 6,
                                                          }}
                                                        />
                                                        {dayjs(
                                                          task.Deadline
                                                        ).diff(dayjs(), "day") >
                                                        0
                                                          ? `Осталось ${dayjs(
                                                              task.Deadline
                                                            ).diff(
                                                              dayjs(),
                                                              "day"
                                                            )} дн`
                                                          : dayjs(
                                                              task.Deadline
                                                            ).diff(
                                                              dayjs(),
                                                              "hour"
                                                            ) > 0
                                                          ? `Осталось ${dayjs(
                                                              task.Deadline
                                                            ).diff(
                                                              dayjs(),
                                                              "hour"
                                                            )} ч`
                                                          : "Срок истёк"}
                                                      </div>
                                                    ) : (
                                                      <div className="deadline-box undefined">
                                                        <ClockCircleOutlined
                                                          style={{
                                                            marginRight: 6,
                                                          }}
                                                        />
                                                        Без срока
                                                      </div>
                                                    )}
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
                              >
                                ➕ Добавить задачу
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
                                      { key: "word", label: "Экспорт в Word" },
                                      {
                                        key: "excel",
                                        label: "Экспорт в Excel",
                                      },
                                      { key: "pdf", label: "Экспорт в PDF" },
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
                            dataSource={tasks.filter((task) => {
                              const query = searchQuery.toLowerCase();
                              const isArchived =
                                task.Status_Name === "Завершена";
                              const matchesArchiveFilter = showArchive
                                ? isArchived
                                : !isArchived;
                              const matchesSearch =
                                !query ||
                                task.Task_Name?.toLowerCase().includes(query) ||
                                task.Description?.toLowerCase().includes(
                                  query
                                ) ||
                                task.Order_Name?.toLowerCase().includes(
                                  query
                                ) ||
                                task.Employees.some((emp) =>
                                  emp?.fullName?.toLowerCase().includes(query)
                                );

                              return matchesArchiveFilter && matchesSearch;
                            })}
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
                      onChange={setSelectedMembers}
                      disabled={!selectedTeamId}
                    >
                      {teams
                        .find((t) => t.ID_Team === selectedTeamId)
                        ?.members.map((member) => {
                          console.log("Rendering member option:", member); // Лог для проверки содержимого
                          return (
                            <Option
                              key={`member-${member.id}`}
                              value={member.fullName}
                            >
                              {member.fullName}
                              {member.role
                                ? ` — ${member.role}`
                                : " — [должность не указана]"}
                            </Option>
                          );
                        })}
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
                    await updateTaskStatus(
                      pendingDragTask.taskId,
                      pendingDragTask.targetStatusId
                    );
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
            </main>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default ManagerDashboard;
