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
import { EditOutlined, InboxOutlined, DeleteOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import { Tooltip, Avatar } from "antd";
import { List } from "antd";
import { useAuth } from "../contexts/useAuth";

interface Employee {
  ID_Employee: number;
  ID_User?: number;
  Full_Name: string;
  Employee_Name?: string; // <-- Добавляем!
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
  Is_Archived?: boolean;
  attachments?: string[];
  OverdueCompleted?: number;
  ID_Status?: number;
}

interface CreateTaskFormValues {
  ID_Team: number;
  ID_Order: number;
  Employees: { value: number; label: string }[];
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
  Is_Archived?: boolean;
}

interface RawEmployee {
  ID_Employee?: number;
  ID_User?: number;
  Employee_Name?: string;
  Full_Name?: string;
  Position?: string;
  Avatar?: string | null;
}

interface CommentType {
  ID_Comment: number;
  CommentText: string;
  Created_At: string;
  AuthorName: string;
  ID_User: number;
  Avatar?: string;
}

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

const STATUSES = ["Новая", "В работе", "Завершена", "Выполнена"];

const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<{
    name?: string;
    teamId?: number;
    projectId?: number;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const [comments, setComments] = useState<CommentType[]>([]);
  const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState<string>("");
  const fetchComments = async (taskId: number) => {
    try {
      const response = await fetch(
        `${API_URL}/api/comments/${taskId}?entityType=task`
      );
      const data = await response.json();
      const cleanedComments = data.map((comment: CommentType) => ({
        ...comment,
        CommentText: comment.CommentText.replace(/(\r\n|\n|\r)/g, " ").trim(),
      }));
      setComments(cleanedComments);
    } catch (error) {
      console.error("Ошибка при получении комментариев:", error);
      messageApi.error("Не удалось загрузить комментарии");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !viewingTaskId) {
      messageApi.error("Комментарий пустой");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      messageApi.error("Нет токена авторизации");
      return;
    }

    try {
      const cleanedComment = newComment.replace(/(\r\n|\n|\r)/g, " ").trim();

      const response = await fetch(`${API_URL}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskId: viewingTaskId,
          commentText: cleanedComment,
          entityType: "task", // 👈 Добавили это поле
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при добавлении комментария");
      }

      setNewComment("");
      fetchComments(viewingTaskId);
      messageApi.success("Комментарий добавлен");
      window.dispatchEvent(new Event("notificationRefresh"));
    } catch (error) {
      console.error("Ошибка при добавлении комментария:", error);
      messageApi.error("Не удалось добавить комментарий");
    }
  };

  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("kanban");
  const [messageApi, contextHolder] = message.useMessage();
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
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

      const rawData: RawTask = await response.json();

      const normalizedTask: Task = {
        ...rawData,
        Employees: rawData.Employees.map((emp: RawEmployee) => ({
          ID_Employee: emp.ID_Employee ?? emp.ID_User ?? 0,
          ID_User: emp.ID_User ?? 0,
          Full_Name: emp.Employee_Name ?? emp.Full_Name ?? "Без имени",
          Position: emp.Position ?? "Без должности",
          Avatar: emp.Avatar ?? null,
        })),
      };

      setTaskDetails(normalizedTask);
      setIsDetailsModalVisible(true);
    } catch (error) {
      console.error("Ошибка при загрузке деталей задачи:", error);
      messageApi.error("Не удалось загрузить детали задачи");
    }
  };

  const [showArchive, setShowArchive] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>("");
  const handleUpdateComment = async () => {
    if (!editingCommentId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const cleanedCommentText = editingCommentText
        .replace(/(\r\n|\n|\r)/g, " ")
        .trim();

      const response = await fetch(
        `${API_URL}/api/comments/${editingCommentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ commentText: cleanedCommentText }),
        }
      );

      if (!response.ok) throw new Error("Ошибка при обновлении комментария");

      setEditingCommentId(null);
      setEditingCommentText("");
      if (viewingTaskId) fetchComments(viewingTaskId);
      messageApi.success("Комментарий обновлен");
    } catch (error) {
      console.error(error);
      messageApi.error("Не удалось обновить комментарий");
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Ошибка при удалении комментария");

      if (viewingTaskId) fetchComments(viewingTaskId);
      messageApi.success("Комментарий удален");
    } catch (error) {
      console.error(error);
      messageApi.error("Не удалось удалить комментарий");
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

      if (task.ID_Team) {
        await loadProjectsAndEmployees(task.ID_Team);
      }

      setTimeout(() => {
        const selectedProject = filteredProjects.find(
          (proj) => proj.ID_Order === task.ID_Order
        );

        form.setFieldsValue({
          ID_Team: task.ID_Team,
          ID_Order: selectedProject
            ? {
                value: selectedProject.ID_Order,
                label: selectedProject.Order_Name,
              }
            : undefined,
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
    if (submitting) return;
    setSubmitting(true);

    try {
      // Проверка на дублирование имени задачи
      const duplicateTask = tasks.find(
        (task) =>
          task.Task_Name.trim().toLowerCase() ===
          values.Task_Name.trim().toLowerCase()
      );

      if (!editingTaskId && duplicateTask) {
        messageApi.error("Задача с таким названием уже существует!");
        setSubmitting(false);
        return;
      }

      if (editingTaskId) {
        // Режим редактирования
        const existingTask = tasks.find((t) => t.ID_Task === editingTaskId);

        const updatedTaskPayload = {
          ...values,
          ID_Status: existingTask?.ID_Status ?? 1,
          Deadline: values.Deadline
            ? dayjs(values.Deadline).toISOString()
            : null,
        };

        const response = await fetch(`${API_URL}/api/tasks/${editingTaskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTaskPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ошибка API: ${response.status} ${errorText}`);
        }

        messageApi.success("Задача успешно обновлена");
      } else {
        // Режим создания
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
          Employee_Names: values.Employees.map((empObj) => {
            const id = empObj.value;
            const emp = filteredEmployees.find((e) => e.ID_Employee === id);
            return emp ? emp.Full_Name : null;
          }).filter((name) => name !== null),
        };

        const response = await fetch(`${API_URL}/api/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parentTaskPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ошибка API: ${response.status} ${errorText}`);
        }

        messageApi.success("Задача успешно создана");
      }

      setIsModalVisible(false);
      setEditingTaskId(null);
      await loadTasks();
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при сохранении задачи");
    } finally {
      setSubmitting(false);
    }
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = showArchive
        ? `${API_URL}/api/tasks/archived`
        : `${API_URL}/api/tasks`;
      const response = await fetch(endpoint);
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

      // 🔥 Проверяем дедлайн и обновляем статус если просрочено
      for (const task of normalized) {
        if (
          task.Status_Name !== "Завершена" &&
          task.Deadline &&
          dayjs(task.Deadline).isBefore(dayjs())
        ) {
          await updateTaskStatus(task.ID_Task, "Завершена");
        }
      }

      setTasks(normalized);
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при загрузке задач");
    } finally {
      setLoading(false);
    }
  }, [messageApi, showArchive]);

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
    .filter((task) => {
      if (showArchive) {
        // Показывать только задачи в архиве
        return task.Status_Name === "Архив" || task.Is_Archived === true;
      } else {
        // Показывать только активные задачи
        return task.Status_Name !== "Архив" && !task.Is_Archived;
      }
    })
    .filter((task) => {
      // Если задача в статусе "Выполнена", показываем её всегда
      if (task.Status_Name === "Выполнена") {
        return true;
      }
      // Для остальных — проверяем, есть ли основной исполнитель
      return !!task.Assigned_Employee_Id;
    })
    .filter((task) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      // Основной исполнитель
      const assignedEmployee = task.Employees.find(
        (emp) =>
          emp.ID_User === task.Assigned_Employee_Id ||
          emp.ID_Employee === task.Assigned_Employee_Id
      );
      const assignedEmployeeName = assignedEmployee?.Full_Name || "";

      // Все назначенные сотрудники (AlsoAssignedEmployees)
      const alsoAssignedEmployeesNames = (task.AlsoAssignedEmployees || [])
        .map((emp) => emp.EmployeeName)
        .join(" ")
        .toLowerCase();

      return (
        task.Task_Name.toLowerCase().includes(query) ||
        task.Description.toLowerCase().includes(query) ||
        task.Order_Name.toLowerCase().includes(query) ||
        assignedEmployeeName.toLowerCase().includes(query) ||
        alsoAssignedEmployeesNames.includes(query)
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

    const task = tasks.find((t) => t.ID_Task === taskId);
    if (!task) {
      messageApi.error("Задача не найдена");
      return;
    }

    // 🔒 Запретить перенос из "Выполнена" в любой другой, кроме "Выполнена"
    if (sourceStatusName === "Выполнена" && targetStatusName !== "Выполнена") {
      messageApi.warning(
        "Нельзя перемещать задачу из статуса 'Выполнена' обратно в другие статусы."
      );
      return;
    }

    // 🔒 Запретить перенос из "Завершена" обратно в статусы "Новая" или "В работе"
    if (
      sourceStatusName === "Завершена" &&
      !["Завершена", "Выполнена"].includes(targetStatusName)
    ) {
      messageApi.warning(
        "Нельзя перемещать задачу обратно из статуса 'Завершена' в другие статусы."
      );
      return;
    }

    // ✅ Разрешить любые переходы из "Завершена" в "Выполнена"
    // Никаких дополнительных ограничений

    if (["Завершена", "Выполнена"].includes(targetStatusName)) {
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

      const statusId = STATUS_MAP[targetStatusName];

      // Собираем данные для обновления с обработкой необязательных полей
      const updatedTask = {
        Task_Name: taskData.Task_Name || "",
        Description: taskData.Description || "",
        Time_Norm: taskData.Time_Norm !== undefined ? taskData.Time_Norm : 0,
        ID_Order: taskData.ID_Order || null,
        Deadline: taskData.Deadline
          ? new Date(taskData.Deadline).toISOString()
          : null,
        ID_Status: statusId,
        onlyStatusUpdate: true,
      };

      // Проверка обязательных полей
      if (
        !updatedTask.Task_Name ||
        !updatedTask.Description ||
        !updatedTask.ID_Order
      ) {
        throw new Error(
          "Ошибка: отсутствуют обязательные поля для обновления задачи"
        );
      }

      const updateResponse = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Ошибка при обновлении задачи: ${errorText}`);
      }

      messageApi.success(`Статус задачи обновлён на "${targetStatusName}"`);
      await loadTasks(); // Перезагрузка задач
    } catch (error) {
      console.error("Ошибка при изменении статуса задачи:", error);
      messageApi.error("Не удалось обновить статус задачи");
    }
  };

  const getDeadlineStatus = (deadline?: string | null, status?: string) => {
    if (!deadline || !status || ["Завершена", "Выполнена"].includes(status)) {
      return {
        label: (
          <>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {["Завершена", "Выполнена"].includes(status || "")
              ? status
              : "Без срока"}
          </>
        ),
        color: "#aaa",
      };
    }

    const now = dayjs();
    const end = dayjs(deadline);

    if (end.isBefore(now)) {
      return {
        label: (
          <>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            Срок истёк
          </>
        ),
        color: "#f44336",
      };
    }

    const diffMinutes = end.diff(now, "minute");
    const diffDays = end.diff(now, "day");

    if (diffDays < 1) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return {
        label: (
          <>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {hours} ч. {minutes} мин.
          </>
        ),
        color: "#b28a00",
      };
    } else if (diffDays <= 3) {
      return {
        label: (
          <>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {diffDays} дн.
          </>
        ),
        color: "#b28a00",
      };
    } else {
      return {
        label: (
          <>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {diffDays} дн.
          </>
        ),
        color: "#388e3c",
      };
    }
  };

  const renderKanbanBoard = () => (
    <>
      <div
        className="kanban-wrapper"
        style={{
          maxHeight: "calc(100vh - 100px)", // Ограничиваем высоту с учетом шапки
          overflowY: "auto",
          overflowX: "auto",
          position: "relative",
        }}
      >
        {/* Фильтры */}
        <div
          className="filter-row"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            position: "sticky",
            top: 0,
            color: "var(--text-color)",
            zIndex: 10,
            padding: "8px 4px",
          }}
        >
          <Button
            className="add-task-button"
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
              style={{
                width: "250px",
                backgroundColor: "var(--input-bg-color)",
                color: "var(--text-color)",
                border: "1px solid var(--border-color)",
              }}
            />
            <Button
              icon={<FilterOutlined />}
              onClick={() => setIsFilterModalVisible(true)}
              style={{
                backgroundColor: "var(--input-bg-color)",
                color: "var(--text-color)",
                border: "1px solid var(--border-color)",
              }}
            >
              Фильтры
            </Button>

            <Dropdown menu={exportMenu} trigger={["click"]}>
              <Button
                icon={<DownloadOutlined />}
                style={{
                  backgroundColor: "var(--input-bg-color)",
                  color: "var(--text-color)",
                  border: "1px solid var(--border-color)",
                }}
              >
                Экспорт
              </Button>
            </Dropdown>
          </div>
        </div>

        {/* Заголовки статусов */}
        <div
          className="kanban-status-row"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${STATUSES.length}, minmax(280px, 1fr))`,
            gap: "12px",
            paddingInline: "4px",
            marginBottom: "12px",
          }}
        >
          {STATUSES.map((status) => (
            <div
              key={`status-title-${status}`}
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "var(--card-bg-color)",
                padding: "10px 12px",
                borderRadius: "8px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                textTransform: "uppercase",
                fontSize: "15px",
                fontWeight: 400,
                color: "var(--text-color)",
                justifyContent: "center",
                position: "relative",
                minHeight: "40px",
              }}
            >
              {/* Вертикальная полоска слева */}
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

        {/* Kanban Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div
            className="kanban-columns"
            style={{
              display: "flex",
              gap: "12px",
              paddingInline: "4px",
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
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
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
                                  {task.OverdueCompleted === 1 && (
                                    <span
                                      style={{
                                        color: "#f44336",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      Срок истёк!
                                    </span>
                                  )}
                                  <p>
                                    <i>Проект:</i> {task.Order_Name}
                                  </p>
                                  <p>
                                    <i>Данный модуль выполняет:</i>{" "}
                                    {getAssignedEmployeeName(task)}
                                  </p>

                                  {(() => {
                                    const assignedUserId =
                                      task.Assigned_Employee_Id;
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
                                  <div
                                    style={{
                                      marginTop: "8px",
                                      fontSize: "13px",
                                      fontStyle: "italic",
                                      color: "#bbb",
                                    }}
                                  >
                                    Дедлайн:{" "}
                                    {task.Status_Name === "Завершена" &&
                                    task.OverdueCompleted === 1 ? (
                                      <span
                                        style={{
                                          color: "#f44336",
                                          fontWeight: "bold",
                                        }}
                                      >
                                        срок истёк
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          color: ["Новая", "В работе"].includes(
                                            task.Status_Name
                                          )
                                            ? "#52c41a"
                                            : "#bbb",
                                          fontWeight: "bold",
                                        }}
                                      >
                                        {task.Deadline
                                          ? dayjs(task.Deadline).format(
                                              "DD.MM.YYYY HH:mm"
                                            )
                                          : "Без срока"}
                                      </span>
                                    )}
                                  </div>

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
                                        onClick={() =>
                                          loadTaskDetails(task.ID_Task)
                                        }
                                      />
                                      <Button
                                        type="link"
                                        icon={<MessageOutlined />}
                                        size="small"
                                        style={{ padding: 0 }}
                                        onClick={() => {
                                          setViewingTaskId(task.ID_Task);
                                          fetchComments(task.ID_Task);
                                          setIsCommentsModalVisible(true);
                                        }}
                                      />
                                    </div>

                                    <div
                                      style={{
                                        backgroundColor: [
                                          "Выполнена",
                                          "Завершена",
                                        ].includes(task.Status_Name)
                                          ? "transparent"
                                          : deadlineInfo?.color,
                                        color: [
                                          "Выполнена",
                                          "Завершена",
                                        ].includes(task.Status_Name)
                                          ? "#ccc"
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
                                      }}
                                    >
                                      {deadlineInfo?.label}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {tasksForStatus.length > 5 && (
                        <>
                          {!isExpanded ? (
                            <Button
                              className="show-more-button"
                              onClick={() =>
                                setExpandedStatuses([
                                  ...expandedStatuses,
                                  status,
                                ])
                              }
                              style={{
                                backgroundColor: "var(--card-bg-color)",
                                color: "var(--text-color)",
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
                          ) : (
                            <Button
                              className="show-more-button"
                              onClick={() =>
                                setExpandedStatuses(
                                  expandedStatuses.filter((s) => s !== status)
                                )
                              }
                              style={{
                                backgroundColor: "var(--card-bg-color)",
                                color: "var(--text-color)",
                                border: "1px solid #444",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontWeight: 500,
                                textAlign: "center",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                              }}
                            >
                              Свернуть
                            </Button>
                          )}
                        </>
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
  );

  const columns: ColumnsType<Task> = [
    {
      title: <div style={{ textAlign: "center" }}>Проект</div>,
      dataIndex: "Order_Name",
      key: "Order_Name",
      align: "left",
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Название задачи</div>,
      dataIndex: "Task_Name",
      key: "Task_Name",
      align: "left",
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Описание</div>,
      dataIndex: "Description",
      key: "Description",
      align: "left",
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Сотрудник</div>,
      dataIndex: "Assigned_Employee_Id",
      key: "Assigned_Employee_Id",
      align: "left",
      render: (_, record) => {
        const assignedEmployee = record.Employees.find(
          (emp) =>
            emp.ID_User === record.Assigned_Employee_Id ||
            emp.ID_Employee === record.Assigned_Employee_Id
        );

        const employeeId =
          assignedEmployee?.ID_User && assignedEmployee.ID_User > 0
            ? assignedEmployee.ID_User
            : assignedEmployee?.ID_Employee && assignedEmployee.ID_Employee > 0
            ? assignedEmployee.ID_Employee
            : null;

        return (
          <span
            style={{
              fontStyle: "italic",
              textDecoration: assignedEmployee ? "underline" : "none",
              cursor: assignedEmployee && employeeId ? "pointer" : "default",
            }}
            onClick={() => {
              if (employeeId) {
                navigate(`/employee/${employeeId}`);
              } else {
                messageApi.warning("Профиль сотрудника не найден");
              }
            }}
          >
            {assignedEmployee?.Full_Name || "–"}
          </span>
        );
      },
    },
    {
      title: <div style={{ textAlign: "center" }}>Статус</div>,
      dataIndex: "Status_Name",
      key: "Status_Name",
      align: "center",
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Дедлайн</div>,
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
      title: <div style={{ textAlign: "center" }}>Действия</div>,
      key: "actions",
      align: "center",
      render: (_, record) => (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Button
            type="link"
            icon={<InboxOutlined />}
            onClick={() => archiveTask(record.ID_Task)}
          />
        </div>
      ),
    },
  ];

  const renderTaskTable = () => (
    <>
<div
  className="kanban-toolbar"
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    padding: "8px 4px",
    marginBottom: "16px",
  }}
>
  {/* Левая часть — всегда слева */}
  <Button
    onClick={openModal}
    icon={<PlusOutlined style={{ color: "inherit" }} />}
  >
    Добавить задачу
  </Button>

  {/* Правая часть — обёртка для кнопок и поиска */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "12px",
      justifyContent: "flex-end",
    }}
  >
    <Input
      placeholder="Поиск задач..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      style={{
        width: "250px",
        backgroundColor: "var(--input-bg-color)",
        color: "var(--text-color)",
        border: "1px solid var(--border-color)",
      }}
    />

    <Button
      icon={<InboxOutlined />}
      onClick={() => setShowArchive(!showArchive)}
    >
      {showArchive ? "Назад" : "Архив"}
    </Button>

    <Button
      icon={<FilterOutlined />}
      onClick={() => setIsFilterModalVisible(true)}
      style={{
        backgroundColor: "var(--input-bg-color)",
        color: "var(--text-color)",
        border: "1px solid var(--border-color)",
      }}
    >
      Фильтры
    </Button>

    <Dropdown menu={exportMenu} trigger={["click"]}>
      <Button
        icon={<DownloadOutlined />}
        style={{
          backgroundColor: "var(--input-bg-color)",
          color: "var(--text-color)",
          border: "1px solid var(--border-color)",
        }}
      >
        Экспорт
      </Button>
    </Dropdown>
  </div>
</div>



      <h2 style={{ marginTop: "16px", marginBottom: "16px", color: "#fff" }}>
        {showArchive ? "Архивные задачи" : "Активные задачи"}
      </h2>

      {filteredTasks.length === 0 ? (
        <p style={{ color: "#aaa" }}>
          {showArchive
            ? "Нет архивированных задач"
            : "Нет активных задач для отображения."}
        </p>
      ) : (
        <Table
          dataSource={filteredTasks}
          columns={columns}
          rowKey="ID_Task"
          pagination={{ pageSize: 10 }}
          bordered
          className="table-no-background"
          style={{ backgroundColor: "transparent" }}
        />
      )}
    </>
  );

  const handleExport = async (format: "excel" | "pdf" | "word") => {
    try {
      const response = await fetch(`${API_URL}/api/export/tasks/${format}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Ошибка при экспорте");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      let fileName = "tasks";
      if (format === "excel") fileName += ".xlsx";
      if (format === "pdf") fileName += ".pdf";
      if (format === "word") fileName += ".docx";

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Ошибка при экспорте:", error);
      messageApi.error("Не удалось экспортировать задачи");
    }
  };

  const exportMenu = {
    items: [
      {
        key: "word",
        label: "Экспорт в Word (.docx)",
        onClick: () => handleExport("word"),
      },
      {
        key: "excel",
        label: "Экспорт в Excel (.xlsx)",
        onClick: () => handleExport("excel"),
      },
      {
        key: "pdf",
        label: "Экспорт в PDF (.pdf)",
        onClick: () => handleExport("pdf"),
      },
    ],
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: darkAlgorithm,
        token: {
          colorBgContainer: "#121212",
          colorText: "#f0f0f0",
          colorPrimary: "#006F7A",
        },
      }}
    >
      <App>
        {contextHolder}
        <div className="manager-dashboard">
          <HeaderManager />
          <div className="dashboard-body">
            <SidebarManager />
            <main className="main-content">
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: "600",
                  marginBottom: "24px",
                }}
              >
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
                labelInValue
                placeholder="Выберите проект"
                onChange={(option) => {
                  form.setFieldValue("ID_Order", option.value);
                  handleProjectChange(option.value);
                }}
                options={filteredProjects.map((project) => ({
                  value: project.ID_Order,
                  label: project.Order_Name,
                }))}
              />
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
          title="Информация о задаче"
          open={isDetailsModalVisible}
          onCancel={() => setIsDetailsModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailsModalVisible(false)}>
              Закрыть
            </Button>,
          ]}
        >
          {taskDetails ? (
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <p>
                <strong>Название:</strong> {taskDetails.Task_Name}
              </p>
              <p>
                <strong>Описание:</strong> {taskDetails.Description}
              </p>
              <p>
                <strong>Проект:</strong> {taskDetails.Order_Name}
              </p>
              <p>
                <strong>Команда:</strong> {taskDetails.Team_Name || "—"}
              </p>
              <p>
                <strong>Статус:</strong> {taskDetails.Status_Name}
              </p>
              <p>
                <strong>Дедлайн:</strong>{" "}
                {taskDetails.Deadline
                  ? dayjs(taskDetails.Deadline).format("YYYY-MM-DD HH:mm")
                  : "—"}
              </p>
              <p>
                <strong>Норма времени:</strong> {taskDetails.Time_Norm} ч.
              </p>

              <p>
                <strong>Сотрудники:</strong>
              </p>
              <div className="kanban-avatars">
                {taskDetails.Employees.length > 0 ? (
                  taskDetails.Employees.map((emp, idx) => (
                    <Tooltip
                      key={`emp-view-${emp.ID_Employee}-${idx}`}
                      title={emp.Full_Name}
                    >
                      <Avatar
                        src={
                          emp.Avatar
                            ? `${API_URL}/uploads/${encodeURIComponent(
                                emp.Avatar
                              )}`
                            : undefined
                        }
                        style={{
                          backgroundColor: emp.Avatar ? "transparent" : "#777",
                          marginRight: 4,
                        }}
                      >
                        {!emp.Avatar &&
                          (emp.Full_Name?.split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() ||
                            "—")}
                      </Avatar>
                    </Tooltip>
                  ))
                ) : (
                  <span style={{ color: "#aaa" }}>—</span>
                )}
              </div>
              <p
                style={{
                  marginTop: 8,
                  fontStyle: "italic",
                  color: "#aaa",
                }}
              >
                Модуль данной задачи выполняет:{" "}
                <strong>
                  {taskDetails.Employees.find(
                    (emp) =>
                      emp.ID_Employee ===
                        Number(taskDetails.Assigned_Employee_Id) ||
                      emp.ID_User === Number(taskDetails.Assigned_Employee_Id)
                  )?.Full_Name || "Не назначено"}
                </strong>
              </p>

              {taskDetails.attachments &&
                taskDetails.attachments.length > 0 && (
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
                      {taskDetails.attachments.map(
                        (filename: string, idx: number) => (
                          <a
                            key={`att-${idx}`}
                            href={`${API_URL}/uploads/${encodeURIComponent(
                              filename
                            )}`}
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
                        )
                      )}
                    </div>
                  </>
                )}
            </div>
          ) : (
            <Loader />
          )}
        </Modal>
        <Modal
          title="Комментарии к задаче"
          open={isCommentsModalVisible}
          onCancel={() => {
            setIsCommentsModalVisible(false);
            setViewingTaskId(null);
            setComments([]);
          }}
          footer={null}
        >
          <List
            dataSource={comments}
            renderItem={(item) => (
              <List.Item
                style={{
                  display: "flex",
                  flexDirection: "column", // расположение кнопок внизу
                  justifyContent: "flex-start",
                  alignItems: "flex-start",
                  textAlign: "left",
                  backgroundColor: "#2a2a2a",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "12px",
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={
                        item.Avatar
                          ? `${API_URL}/uploads/${item.Avatar}`
                          : undefined
                      }
                      style={{
                        backgroundColor: item.Avatar ? "transparent" : "#777",
                      }}
                    >
                      {!item.Avatar &&
                        item.AuthorName?.split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                    </Avatar>
                  }
                  title={
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        whiteSpace: "nowrap",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontWeight: "bold", color: "#fff" }}>
                        {item.AuthorName}
                      </span>
                      <span style={{ fontSize: 12, color: "#999" }}>
                        {dayjs(item.Created_At).format("YYYY-MM-DD HH:mm")}
                      </span>
                    </div>
                  }
                  description={
                    <div
                      className="comment-text-container"
                      style={{
                        color: "#fff",
                        textAlign: "left",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {editingCommentId === item.ID_Comment ? (
                        <Input.TextArea
                          value={editingCommentText}
                          onChange={(e) =>
                            setEditingCommentText(e.target.value)
                          }
                          autoSize
                        />
                      ) : (
                        <p
                          className="comment-text"
                          style={{
                            margin: 0,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                          }}
                        >
                          {item.CommentText.replace(
                            /(\r\n|\n|\r)/g,
                            " "
                          ).trim()}
                        </p>
                      )}
                    </div>
                  }
                />

                {item.ID_User === user?.id && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignSelf: "flex-end",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {editingCommentId === item.ID_Comment ? (
                      <>
                        <Button
                          size="small"
                          type="primary"
                          onClick={handleUpdateComment}
                          style={{ border: "none", boxShadow: "none" }}
                        >
                          Сохранить
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingCommentText("");
                          }}
                          style={{ border: "none", boxShadow: "none" }}
                        >
                          Отмена
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingCommentId(item.ID_Comment);
                            setEditingCommentText(item.CommentText);
                          }}
                        />
                        <Button
                          size="small"
                          icon={<DeleteOutlined />}
                          danger
                          onClick={() => handleDeleteComment(item.ID_Comment)}
                        />
                      </>
                    )}
                  </div>
                )}
              </List.Item>
            )}
          />

          <Input.TextArea
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Введите комментарий..."
            style={{ marginTop: 8 }}
          />
          <Button
            type="primary"
            block
            style={{ marginTop: 8 }}
            onClick={handleAddComment}
            disabled={!newComment.trim()}
          >
            Добавить комментарий
          </Button>
        </Modal>
      </App>
    </ConfigProvider>
  );
};

export default ManagerDashboard;
