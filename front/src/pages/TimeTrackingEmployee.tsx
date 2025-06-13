import React, { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Button,
  Form,
  Input,
  DatePicker,
  Upload,
  notification,
  Modal,
  App,
  Tooltip,
  InputNumber,
  Checkbox,
} from "antd";
import { useNavigate } from "react-router-dom";

import {
  InboxOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { Tabs, Table } from "antd";
import { UploadFile } from "antd/es/upload/interface";
import HeaderEmployee from "../components/HeaderEmployee";
import Sidebar from "../components/Sidebar";
import "../styles/pages/TimeTrackingEmployee.css";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";
import localeData from "dayjs/plugin/localeData";
import "dayjs/locale/ru";
import { MessageOutlined } from "@ant-design/icons";
import { List, Avatar } from "antd";
import { Dropdown } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import { PlusOutlined } from "@ant-design/icons";
import { Select } from "antd";
import { Radio } from "antd";
import { useParams } from "react-router-dom";

dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.locale("ru");

const { Content } = Layout;
const API_URL = import.meta.env.VITE_API_URL;

interface Project {
  ID_Order: string;
  Order_Name: string;
  ID_Team: string;
}

interface Task {
  ID_Task: string;
  Task_Name: string;
  Status: string;
  ID_Order: string;
  Time_Norm?: number;
}

interface TimeTrackingFormValues {
  project: string;
  taskName: string;
  description: string;
  hours: number;
  minutes: number;
  date: dayjs.Dayjs;
  file: UploadFile[];
  isCompleted?: boolean;
}

interface RawTimeEntry {
  ID_Execution: string;
  ID_Task: string;
  Task_Name: string;
  Order_Name: string;
  Start_Date: string;
  End_Date: string;
  Hours_Spent: number;
  Description?: string;
  Attachments?: string[];
  ID_User: string;
  ID_Employee: string;
  link?: string;
  Hours_Spent_Total?: number;
  Time_Norm?: number;
  FitTimeNorm?: boolean;
  Employee_Email?: string;
}

interface CommentType {
  ID_Comment: number;
  CommentText: string;
  Created_At: string;
  AuthorName: string;
  Avatar?: string;
  ID_User?: number;
  isExecutionComment?: boolean;
}


const TimeTrackingEmployee: React.FC = () => {
  const navigate = useNavigate();

  const { executionId } = useParams<{ executionId: string }>();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RawTimeEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<RawTimeEntry | null>(null);
  const [timeEntries, setTimeEntries] = useState<RawTimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekStart, setWeekStart] = useState(() => dayjs().startOf("isoWeek"));
  const [api, contextHolder] = notification.useNotification();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
  const [editingFileList, setEditingFileList] = useState<UploadFile[]>([]);
  const createNotification = async ({
    token,
    userEmail,
    title,
    description,
    link,
  }: {
    token: string;
    userEmail: string;
    title: string;
    description: string;
    link?: string;
  }) => {
    try {
      console.log("DEBUG: createNotification called with:", userEmail, title, description, link);

      await fetch(`${API_URL}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userEmail,
          title,
          description,
          link,
        }),
      });
    } catch (error) {
      console.error("Ошибка при создании уведомления:", error);
    }
  };
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const getFilteredEntriesByDay = (day: dayjs.Dayjs) =>
    filteredEntries.filter((entry) =>
      dayjs(entry.Start_Date).isSame(day, "day")
    );
  const activeTasks = tasks;

  const filteredEntries = selectedProjectId
    ? timeEntries.filter((entry) =>
        projects.some(
          (p) =>
            p.ID_Order === selectedProjectId &&
            p.Order_Name === entry.Order_Name
        )
      )
    : timeEntries;

  const weekDaysRu = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье",
  ];

  const fetchProjects = useCallback(async () => {
    const token = localStorage.getItem("token");
    const userResponse = await fetch(`${API_URL}/api/auth/current-user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = await userResponse.json();
    const response = await fetch(`${API_URL}/api/projects`);
    const data = await response.json();
    setProjects(data.filter((p: Project) => p.ID_Team === userData.ID_Team));
  }, []);

  const fetchTasks = useCallback(async () => {
    const token = localStorage.getItem("token");
    const userResponse = await fetch(`${API_URL}/api/auth/current-user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = await userResponse.json();

    const res = await fetch(
      `${API_URL}/api/employees/${userData.ID_User}/tasks`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();
    setTasks(data);
  }, []);

  const fetchTimeEntries = useCallback(async () => {
    const token = localStorage.getItem("token");
    const userResponse = await fetch(`${API_URL}/api/auth/current-user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = await userResponse.json();

    const res = await fetch(`${API_URL}/api/time-tracking`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const allEntries: RawTimeEntry[] = await res.json();

    // 🟢 Вставляем логи
    console.log("Сырые записи учета времени:", allEntries);
    console.log("user.id:", userData.ID_User);

    const userEntries = allEntries.filter(
      (entry) => entry.ID_Employee === userData.ID_User
    );

    setTimeEntries(userEntries);
  }, []);

  const getManagerEmail = async (orderId: string): Promise<string> => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/projects/${orderId}/manager-email`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.email || "";
    } catch (error) {
      console.error("Ошибка при получении email менеджера:", error);
      return "";
    }
  };
  
  useEffect(() => {
    fetchProjects();
    fetchTasks();
    if (executionId) {
      fetchSingleEntry(executionId);
    } else {
      fetchTimeEntries();
    }
  }, [fetchProjects, fetchTasks, fetchTimeEntries, executionId]);

  const fetchSingleEntry = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/time-tracking/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Ошибка загрузки записи: ${res.status}`);
      const entry: RawTimeEntry = await res.json();
      setTimeEntries([entry]); // Показать только эту запись
    } catch (error) {
      console.error("Ошибка при загрузке записи:", error);
    }
  };

  const handleEdit = (entry: RawTimeEntry) => {
    const project = projects.find(
      (p) => p.Order_Name === entry.Order_Name
    )?.ID_Order;

    const fileList: UploadFile[] = (entry.Attachments || []).map(
      (filename, index) => ({
        uid: `${index}`,
        name: filename,
        status: "done",
        url: `${API_URL}/uploads/${filename}`,
      })
    );
    if (entry.link) {
      fileList.push({
        uid: `link`,
        name: "Ссылка",
        status: "done",
        url: entry.link,
      });
    }
    setEditingFileList(fileList);

    setEditingEntry(entry);

    const hours = Math.floor(entry.Hours_Spent);
    const minutes = Math.round((entry.Hours_Spent - hours) * 60);

    const attachmentType = entry.link ? "link" : "file";

    form.setFieldsValue({
      project,
      taskName: entry.ID_Task,
      hours,
      minutes,
      date: dayjs(entry.Start_Date),
      description: entry.Description || "",
      attachmentType,
      file: fileList,
      link: entry.link || "",
    });

    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/time-tracking/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Ошибка ${res.status}: ${errorText}`);
      }

      api.success({ message: "Запись удалена" });
      fetchTimeEntries();
    } catch (error: unknown) {
      if (error instanceof Error) {
        api.error({ message: `Ошибка удаления: ${error.message}` });
      } else {
        api.error({ message: "Неизвестная ошибка при удалении" });
      }
    }
  };

  const handleFormSubmit = async (
    values: TimeTrackingFormValues & { attachmentType: string; link?: string }
  ) => {
    const token = localStorage.getItem("token");

    const totalHours = (values.hours || 0) + (values.minutes || 0) / 60;

    const selectedTask = tasks.find((t) => t.ID_Task === values.taskName);

    if (!selectedTask) {
      api.error({
        message: "Выберите корректную задачу.",
      });
      return;
    }

    // 🚀 Добавляем Time_Norm в запись (можно использовать для отчётов или подсказок)
    const timeNorm = selectedTask?.Time_Norm || 0;

    const payload = {
      taskName: values.taskName,
      date: values.date.toISOString(),
      description: values.description,
      hours: parseFloat(totalHours.toFixed(2)),
      timeNorm,
      isCompleted: values.isCompleted,
      ID_User: user?.id,
      ID_Employee: user?.id,
      attachments:
        values.attachmentType === "file"
          ? editingFileList.map((f) => f.name) // имена файлов, если файлы
          : [],
      link: values.attachmentType === "link" ? values.link : "",
    };

    const method = editingEntry ? "PUT" : "POST";
    const url = `${API_URL}/api/time-tracking${
      editingEntry ? `/${editingEntry.ID_Execution}` : ""
    }`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log("Ответ сервера:", text);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Ошибка ${res.status}: ${errorText}`);
      }

      api.success({
        message: editingEntry ? "Запись обновлена" : "Время добавлено",
      });
      const managerEmail = selectedTask?.ID_Order ? await getManagerEmail(selectedTask.ID_Order) : "";

      await createNotification({
        token: token ?? "",
        userEmail: managerEmail,
        title: editingEntry ? "Время обновлено" : "Новое время добавлено",
        description: `Задача: ${selectedTask?.Task_Name || "Неизвестно"}`,
        link: `/tasks/${selectedTask?.ID_Task || ""}`
      });
      
      await fetchTimeEntries(); // Обновить карточки
      form.resetFields(); // Очистить форму
      setEditingEntry(null); // Сброс редактирования
      setIsModalVisible(false); // Закрыть модал
    } catch (error: unknown) {
      if (error instanceof Error) {
        api.error({ message: `Ошибка при сохранении: ${error.message}` });
      } else {
        api.error({ message: "Неизвестная ошибка при сохранении" });
      }
    }
  };

  const fetchComments = async (entry: RawTimeEntry) => {
    const token = localStorage.getItem("token");
    if (!token) return;
  
    const url = entry.ID_Execution
      ? `${API_URL}/api/comments/execution/${entry.ID_Execution}`
      : `${API_URL}/api/comments/${entry.ID_Task}`;
  
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (!res.ok) {
        throw new Error(`Ошибка загрузки комментариев: ${res.status}`);
      }
  
      const data: CommentType[] = await res.json();
  
      const enriched: CommentType[] = data.map((comment) => ({
        ...comment,
        isExecutionComment: !!entry.ID_Execution,
      }));
  
      setComments(enriched);
    } catch (error) {
      console.error("Ошибка при получении комментариев:", error);
    }
  };
  
  

 const handleAddComment = async () => {
  console.log("DEBUG: handleAddComment called", viewingEntry);

  if (!newComment.trim() || !viewingEntry) return;

  try {
    const token = localStorage.getItem("token");

    // Выбираем endpoint и тело запроса в зависимости от контекста
    const url = viewingEntry.ID_Execution
      ? `${API_URL}/api/comments/execution`
      : `${API_URL}/api/comments`;

    const body = viewingEntry.ID_Execution
      ? {
          executionId: viewingEntry.ID_Execution,
          commentText: newComment.trim(),
        }
      : {
          taskId: viewingEntry.ID_Task,
          commentText: newComment.trim(),
          entityType: "task",
        };

    // Отправляем комментарий
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Ошибка при добавлении комментария");

    // Отправляем уведомление менеджеру
    await createNotification({
      token: token ?? "",
      userEmail: viewingEntry.Employee_Email ?? "",
      title: "Новый комментарий",
      description: `Новый комментарий к задаче: ${viewingEntry.Task_Name}`,
      link: `/tasks/${viewingEntry.ID_Task}`,
    });

    await fetchComments(viewingEntry);
    setNewComment("");
    api.success({ message: "Комментарий добавлен" });
  } catch (error) {
    console.error("Ошибка при добавлении комментария:", error);
    api.error({ message: "Не удалось добавить комментарий" });
  }
};


  const openCommentsModal = (entry: RawTimeEntry) => {
    setViewingEntry(entry);
    setIsCommentsModalVisible(true);
    fetchComments(entry);
  };

  const handleViewEntry = async (entry: RawTimeEntry) => {
    setViewingEntry(entry); // сначала показать старое состояние
    setIsViewModalVisible(true);

    try {
      const res = await fetch(
        `${API_URL}/api/tasks/${entry.ID_Task}/attachments`
      );
      if (!res.ok) throw new Error(`Ошибка загрузки вложений: ${res.status}`);
      const data = await res.json();

      setViewingEntry((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          Attachments: data.attachments || prev.Attachments,
          link: data.link || prev.link,
        };
      });
    } catch (error) {
      console.error("Ошибка при получении вложений:", error);
    }
  };

  const getWeekDays = () =>
    Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));

  const normFile = (e: { fileList: UploadFile[] }) =>
    Array.isArray(e) ? e : e.fileList;

  console.log("Активные задачи:", activeTasks);
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
  
      // ✅ Определяем тип комментария по isExecutionComment
      const comment = comments.find(c => c.ID_Comment === editingCommentId);
      const isExecution = comment?.isExecutionComment;
  
      const response = await fetch(
        `${API_URL}/api/comments${isExecution ? "/execution" : ""}/${editingCommentId}`,
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
  
      if (viewingEntry) {
        await fetchComments(viewingEntry);
      }
  
      api.success({ message: "Комментарий обновлен" });
    } catch (error) {
      console.error(error);
      api.error({ message: "Не удалось обновить комментарий" });
    }
  };
  

  const handleDeleteComment = async (commentId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
  
    try {
      // ✅ Определяем тип комментария по isExecutionComment
      const comment = comments.find(c => c.ID_Comment === commentId);
      const isExecution = comment?.isExecutionComment;
  
      const response = await fetch(
        `${API_URL}/api/comments${isExecution ? "/execution" : ""}/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (!response.ok) throw new Error("Ошибка при удалении комментария");
  
      if (viewingEntry) {
        await fetchComments(viewingEntry);
      }
  
      api.success({ message: "Комментарий удален" });
    } catch (error) {
      console.error(error);
      api.error({ message: "Не удалось удалить комментарий" });
    }
  };
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.ID_User || user.id;

  return (
    <App>
      {contextHolder}
      <Layout className="layout">
        <Sidebar role="employee" />
        <Layout className="main-layout">
          <HeaderEmployee />
          <Content className="content">
            <div className="page-content">
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  flexBasis: "100%",
                  marginTop: "32px",
                  marginBottom: "24px",
                }}
              >
                Учёт времени
              </h1>

              {/* 👉 Вкладки */}
              <Tabs
                defaultActiveKey="cards"
                type="card"
                items={[
                  {
                    key: "cards",
                    label: "Карточки",
                    children: (
                      <>
                        {/* 👉 Фильтры и кнопки */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "1rem",
                            width: "100%",
                            marginTop: "24px", // уменьшили отступ сверху
                            marginBottom: "24px", // уменьшили отступ снизу
                          }}
                        >
                          {/* Левая часть — кнопка добавления */}
                          <Button
                            className="dark-action-button"
                            icon={<PlusOutlined style={{ color: "inherit" }} />}
                            onClick={() => {
                              form.resetFields();
                              setEditingEntry(null);
                              setIsModalVisible(true);
                            }}
                          >
                            Добавить потраченное время
                          </Button>

                          {/* Правая часть — фильтры и навигация */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "1rem",
                            }}
                          >
                            <Button
                              icon={<LeftOutlined />}
                              onClick={() =>
                                setWeekStart(weekStart.subtract(1, "week"))
                              }
                            />
                            <h2 style={{ margin: "0 1rem" }}>
                              {weekStart.format("D MMMM")} –{" "}
                              {weekStart.add(6, "day").format("D MMMM YYYY")}
                            </h2>
                            <Button
                              icon={<RightOutlined />}
                              onClick={() =>
                                setWeekStart(weekStart.add(1, "week"))
                              }
                            />
                            <DatePicker
                              value={weekStart}
                              format="DD.MM.YYYY"
                              allowClear={false}
                              suffixIcon={<CalendarOutlined />}
                              style={{ marginLeft: 12 }}
                              inputReadOnly
                              onChange={(date) => {
                                if (date && dayjs.isDayjs(date)) {
                                  setWeekStart(date.startOf("isoWeek"));
                                }
                              }}
                              disabledDate={(current) =>
                                current &&
                                (current.year() < 2000 || current.year() > 2100)
                              }
                            />
                            <Dropdown
  menu={{
    items: [
      ...projects.map((p) => ({
        key: p.ID_Order,
        label: p.Order_Name,
        onClick: () => setSelectedProjectId(p.ID_Order),
      })),
      { type: "divider" },
      {
        key: "reset",
        label: "Сбросить фильтр",
        onClick: () => setSelectedProjectId(null),
      },
    ],
  }}
  placement="bottomRight"
  arrow
>
  <Button icon={<FilterOutlined />}>
    {selectedProjectId
      ? projects.find((p) => p.ID_Order === selectedProjectId)?.Order_Name
      : "Фильтр по проекту"}
  </Button>
</Dropdown>

                          </div>
                        </div>

                        {/* 👉 Карточки */}
                        <div className="horizontal-columns">
                          {getWeekDays().map((day) => (
                            <div
                              key={day.toString()}
                              className="horizontal-column"
                            >
                              <div className="day-header">
                                {weekDaysRu[day.isoWeekday() - 1]}
                              </div>
                              <div className="day-date">
                                {day.format("DD.MM")}
                              </div>
                              <div className="card-stack">
                                {getFilteredEntriesByDay(day).map((entry) => (
                                  <div
                                    key={entry.ID_Execution}
                                    className="entry-card"
                                  >
                                    <div>
                                      <b>{entry.Task_Name}</b>
                                      <div>Проект: {entry.Order_Name}</div>
                                      <div>{entry.Hours_Spent} ч</div>
                                    </div>
                                    <div
                                      style={{
                                        marginTop: 8,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <div style={{ display: "flex", gap: 4 }}>
                                        <Tooltip title="Просмотр">
                                          <Button
                                            size="small"
                                            icon={<EyeOutlined />}
                                            onClick={() =>
                                              handleViewEntry(entry)
                                            }
                                          />
                                        </Tooltip>
                                        <Tooltip title="Комментарии">
                                          <Button
                                            size="small"
                                            icon={<MessageOutlined />}
                                            onClick={() =>
                                              openCommentsModal(entry)
                                            }
                                          />
                                        </Tooltip>
                                      </div>
                                      <div style={{ display: "flex", gap: 4 }}>
                                        <Tooltip title="Редактировать">
                                          <Button
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() => handleEdit(entry)}
                                          />
                                        </Tooltip>
                                        <Tooltip title="Удалить">
                                          <Button
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            danger
                                            onClick={() =>
                                              handleDelete(entry.ID_Execution)
                                            }
                                          />
                                        </Tooltip>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ),
                  },
                  {
                    key: "table",
                    label: "Таблица",
                    children: (
                      <>
                        {/* 👉 Верхняя панель: кнопка + поисковая строка */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "24px", // увеличиваем отступ сверху
                            marginBottom: "24px", // увеличиваем отступ снизу
                          }}
                        >
                          {/* Левая часть — кнопка добавления */}
                          <Button
                            className="dark-action-button"
                            icon={<PlusOutlined style={{ color: "inherit" }} />}
                            onClick={() => {
                              form.resetFields();
                              setEditingEntry(null);
                              setIsModalVisible(true);
                            }}
                          >
                            Добавить потраченное время
                          </Button>

                          {/* Правая часть — поисковая строка */}
                          <Input
                            placeholder="Поиск задач или проектов..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: 250 }}
                          />
                        </div>

                        {/* 👉 Таблица */}
                        <Table
                          dataSource={timeEntries.filter((entry) => {
                            const query = searchQuery.trim().toLowerCase();
                            return (
                              !query ||
                              entry.Task_Name.toLowerCase().includes(query) ||
                              entry.Order_Name.toLowerCase().includes(query)
                            );
                          })}
                          rowKey="ID_Execution"
                          pagination={{ pageSize: 10 }}
                          columns={[
                            {
                              title: "Задача",
                              dataIndex: "Task_Name",
                              key: "task",
                            },
                            {
                              title: "Проект",
                              dataIndex: "Order_Name",
                              key: "order",
                            },
                            {
                              title: "Начало",
                              dataIndex: "Start_Date",
                              key: "start",
                              render: (date: string) =>
                                dayjs(date).format("DD.MM.YYYY HH:mm"),
                            },
                            {
                              title: "Окончание",
                              dataIndex: "End_Date",
                              key: "end",
                              render: (date: string) =>
                                dayjs(date).format("DD.MM.YYYY HH:mm"),
                            },
                            {
                              title: "Потрачено (запись)",
                              dataIndex: "Hours_Spent",
                              key: "hours",
                            },
                            {
                              title: "Норма времени",
                              dataIndex: "Time_Norm",
                              key: "timeNorm",
                              render: (val: number | undefined) =>
                                val ? `${val} ч` : "-",
                            },
                            {
                              title: "Вложился в норму?",
                              dataIndex: "FitTimeNorm",
                              key: "fitTimeNorm",
                              render: (val: boolean | undefined) =>
                                val === undefined ? "-" : val ? "Да" : "Нет",
                            },
                            {
                              title: "Готовность задачи",
                              dataIndex: "Is_Completed",
                              key: "isCompleted",
                              render: (val) =>
                                val ? "Завершена" : "Не завершена",
                            },
                          ]}
                        />
                      </>
                    ),
                  },
                ]}
              />

              <Modal
                title={
                  editingEntry ? "Редактировать" : "Добавить потраченное время"
                }
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={[
                  <Button key="cancel" onClick={() => setIsModalVisible(false)}>
                    Отмена
                  </Button>,
                  <Button
                    key="submit"
                    type="primary"
                    onClick={() => form.submit()}
                  >
                    {editingEntry ? "Сохранить" : "Добавить"}
                  </Button>,
                ]}
              >
                <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
                  <Form.Item
                    name="taskName"
                    label="Задача"
                    rules={[{ required: true }]}
                  >
                    <Select
                      placeholder="Выберите задачу"
                      onChange={(taskId) => {
                        const selectedTask = tasks.find(
                          (t) => t.ID_Task === taskId
                        );
                        form.setFieldsValue({
                          taskName: taskId,
                          project: selectedTask?.ID_Order,
                        });
                      }}
                    >
                      {tasks.map((t) => (
                        <Select.Option key={t.ID_Task} value={t.ID_Task}>
                          {t.Task_Name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="description" label="Описание">
                    <Input.TextArea />
                  </Form.Item>

                  <Form.Item label="Потрачено времени" required>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <Form.Item
                        name="hours"
                        style={{ marginBottom: 0, flex: 1 }}
                        rules={[
                          {
                            required: true,
                            message: "Введите часы",
                          },
                          {
                            type: "number",
                            min: 0,
                            message: "Часы не могут быть отрицательными",
                          },
                        ]}
                      >
                        <InputNumber
                          placeholder="Часы"
                          min={0}
                          style={{ width: "100%" }}
                          className="time-input"
                        />
                      </Form.Item>

                      <Form.Item
                        name="minutes"
                        style={{ marginBottom: 0, flex: 1 }}
                        rules={[
                          {
                            required: true,
                            message: "Введите минуты",
                          },
                          {
                            type: "number",
                            min: 0,
                            max: 59,
                            message: "Минуты от 0 до 59",
                          },
                        ]}
                      >
                        <InputNumber
                          placeholder="Минуты"
                          min={0}
                          max={59}
                          style={{ width: "100%" }}
                          className="time-input"
                        />
                      </Form.Item>
                    </div>
                  </Form.Item>

                  <Form.Item
                    name="date"
                    label="Дата"
                    rules={[
                      { required: true, message: "Выберите дату и время" },
                    ]}
                  >
                    <DatePicker
                      showTime
                      format="YYYY-MM-DD HH:mm"
                      style={{ width: "100%" }}
                      disabledDate={(current) =>
                        current && current > dayjs().endOf("day")
                      }
                      disabledTime={(current) => {
                        if (!current) return {};
                        const now = dayjs();
                        if (current.isSame(now, "day")) {
                          return {
                            disabledHours: () =>
                              Array.from({ length: 24 }, (_, i) =>
                                i > now.hour() ? i : -1
                              ).filter((h) => h !== -1),
                            disabledMinutes: (selectedHour) => {
                              if (selectedHour === now.hour()) {
                                return Array.from({ length: 60 }, (_, i) =>
                                  i > now.minute() ? i : -1
                                ).filter((m) => m !== -1);
                              }
                              return [];
                            },
                          };
                        }
                        return {};
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="isCompleted"
                    label="Завершена ли задача?"
                    valuePropName="checked"
                  >
                    <Checkbox>Да</Checkbox>
                  </Form.Item>

                  <Form.Item label="Прикрепление материала" required>
                    <Form.Item
                      name="attachmentType"
                      noStyle
                      initialValue="file"
                    >
                      <Radio.Group
                        optionType="button"
                        buttonStyle="solid"
                        className="attachment-type-switch"
                        style={{ marginBottom: 12 }}
                        onChange={(e) => {
                          const type = e.target.value;
                          if (type === "file") {
                            form.setFieldsValue({ link: "" });
                          } else {
                            setEditingFileList([]);
                            form.setFieldsValue({ file: [] });
                          }
                        }}
                      >
                        <Radio.Button value="file">Файл</Radio.Button>
                        <Radio.Button value="link">Ссылка</Radio.Button>
                      </Radio.Group>
                    </Form.Item>

                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, curr) =>
                        prev.attachmentType !== curr.attachmentType
                      }
                    >
                      {({ getFieldValue }) => {
                        const type = getFieldValue("attachmentType");
                        if (type === "file") {
                          return (
                            <Form.Item
                              name="file"
                              valuePropName="fileList"
                              getValueFromEvent={normFile}
                              className="attachment-upload"
                            >
                              <Upload
                                beforeUpload={() => false}
                                multiple
                                accept=".pdf,.doc,.docx,.png,.jpg"
                                fileList={editingFileList}
                                onChange={({ fileList }) =>
                                  setEditingFileList(fileList)
                                }
                              >
                                <Button icon={<InboxOutlined />}>
                                  Выберите файлы
                                </Button>
                              </Upload>
                            </Form.Item>
                          );
                        } else {
                          return (
                            <Form.Item
                              name="link"
                              className="attachment-link"
                              rules={[
                                { required: true, message: "Введите ссылку" },
                                {
                                  type: "url",
                                  message: "Введите корректный URL",
                                },
                              ]}
                            >
                              <Input placeholder="https://example.com" />
                            </Form.Item>
                          );
                        }
                      }}
                    </Form.Item>
                  </Form.Item>
                </Form>
              </Modal>

              <Modal
                title="Просмотр записи"
                open={isViewModalVisible}
                onCancel={() => setIsViewModalVisible(false)}
                footer={
                  <Button onClick={() => setIsViewModalVisible(false)}>
                    Закрыть
                  </Button>
                }
              >
                {viewingEntry && (
                  <div style={{ lineHeight: 1.8 }}>
                    <p>
                      <b>Задача:</b> {viewingEntry.Task_Name}
                    </p>
                    <p>
                      <b>Проект:</b> {viewingEntry.Order_Name}
                    </p>
                    <p>
                      <b>Дата начала:</b>{" "}
                      {dayjs(viewingEntry.Start_Date).format(
                        "DD.MM.YYYY HH:mm"
                      )}
                    </p>
                    <p>
                      <b>Дата окончания:</b>{" "}
                      {dayjs(viewingEntry.End_Date).format("DD.MM.YYYY HH:mm")}
                    </p>
                    <p>
                      <b>Потрачено (запись):</b> {viewingEntry.Hours_Spent} ч
                    </p>

                    <p>
                      <b>Норма времени:</b>{" "}
                      {viewingEntry.Time_Norm
                        ? `${viewingEntry.Time_Norm} ч`
                        : "-"}
                    </p>
                    <p>
                      <b>Вложился в норму:</b>{" "}
                      {viewingEntry.FitTimeNorm === undefined
                        ? "-"
                        : viewingEntry.FitTimeNorm
                        ? "Да"
                        : "Нет"}
                    </p>

                    {viewingEntry.Description && (
                      <p>
                        <b>Описание:</b> {viewingEntry.Description}
                      </p>
                    )}
                    {(viewingEntry.Attachments || []).length > 0 ||
                    viewingEntry.link ? (
                      <div>
                        <p>
                          <b>Вложения:</b>
                        </p>
                        <ul className="attachments-list">
                          {/* Отображаем Attachments */}
                          {(viewingEntry.Attachments || []).map((item, idx) => {
                            const isUrl = /^https?:\/\//.test(item);
                            const href = isUrl
                              ? item
                              : `${API_URL}/uploads/${item}`;
                            const label = isUrl ? item : item.split("/").pop();
                            return (
                              <li key={`file-${idx}`}>
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {label}
                                </a>
                              </li>
                            );
                          })}

                          {/* Отображаем ссылку, если есть */}
                          {viewingEntry.link && (
                            <li key="link">
                              <a
                                href={viewingEntry.link}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {viewingEntry.link}
                              </a>
                            </li>
                          )}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </Modal>

              <Modal
                title="Комментарии"
                open={isCommentsModalVisible}
                onCancel={() => setIsCommentsModalVisible(false)}
                footer={null}
              >
                {viewingEntry && (
                  <>
                    <List
                      dataSource={comments}
                      renderItem={(item) => (
                        <List.Item
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            paddingRight: "8px",
                          }}
                        >
                          <List.Item.Meta
                            avatar={
                              <Tooltip title="Перейти в профиль">
                                <div
                                  onClick={() => {
                                    if (item.ID_User) {
                                      navigate(`/employee/${item.ID_User}`);
                                    }
                                  }}
                                  style={{
                                    cursor: item.ID_User
                                      ? "pointer"
                                      : "default",
                                  }}
                                >
                              <Avatar
  src={item.Avatar ? `${API_URL}/uploads/${item.Avatar}` : undefined}
  style={{
    backgroundColor: item.Avatar ? "transparent" : "#777",
    color: "#fff",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textTransform: "uppercase",
    userSelect: "none",
  }}
>
  {!item.Avatar &&
    (item.AuthorName?.split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("") || "–")}
</Avatar>

                                </div>
                              </Tooltip>
                            }
                            title={
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  width: "100%",
                                }}
                              >
                                <span
                                  style={{ fontWeight: "bold", color: "#fff" }}
                                >
                                  {item.AuthorName}
                                </span>
                                <span style={{ fontSize: 12, color: "#999" }}>
                                  {dayjs(item.Created_At).format(
                                    "YYYY-MM-DD HH:mm"
                                  )}
                                </span>
                              </div>
                            }
                            description={
                              <div
                                style={{
                                  color: "#fff",
                                  wordBreak: "break-word",
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
                                  <p style={{ margin: 0 }}>
                                    {item.CommentText}
                                  </p>
                                )}
                              </div>
                            }
                          />

                          {/* Правая часть — кнопки */}
                          {String(item.ID_User) === String(userId) && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginLeft: "auto",
                              }}
                            >
                              {editingCommentId === item.ID_Comment ? (
                                <>
                                  <Button
                                    type="primary"
                                    size="small"
                                    onClick={handleUpdateComment}
                                    style={{
                                      border: "none",
                                      boxShadow: "none",
                                    }}
                                  >
                                    Сохранить
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentText("");
                                    }}
                                    style={{
                                      border: "none",
                                      boxShadow: "none",
                                    }}
                                  >
                                    Отмена
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    type="link"
                                    size="small"
                                    style={{
                                      color: "#fff",
                                      border: "none",
                                      boxShadow: "none",
                                    }}
                                    onClick={() => {
                                      setEditingCommentId(item.ID_Comment);
                                      setEditingCommentText(item.CommentText);
                                    }}
                                    icon={<EditOutlined />}
                                  />
                                  <Button
                                    type="link"
                                    size="small"
                                    style={{
                                      color: "#fff",
                                      border: "none",
                                      boxShadow: "none",
                                    }}
                                    danger
                                    onClick={() =>
                                      handleDeleteComment(item.ID_Comment)
                                    }
                                    icon={<DeleteOutlined />}
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
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      style={{ marginTop: 8 }}
                      block
                    >
                      Добавить комментарий
                    </Button>
                  </>
                )}
              </Modal>
            </div>
          </Content>
        </Layout>
      </Layout>
    </App>
  );
};

export default TimeTrackingEmployee;
