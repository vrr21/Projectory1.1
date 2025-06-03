import React, { useEffect, useState, useCallback, useMemo } from "react";

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
} from "antd";
import { EyeOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/useAuth";
import HeaderEmployee from "../components/HeaderEmployee";
import Sidebar from "../components/Sidebar";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import dayjs from "dayjs";
import "../styles/pages/ManagerDashboard.css";

import { Input, List } from "antd";
import { MessageOutlined } from "@ant-design/icons";

import { DownloadOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";

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
  attachments?: string[];
}

interface CommentType {
  ID_Comment: number;
  CommentText: string;
  Created_At: string;
  AuthorName: string;
  ID_User: number;
  Avatar?: string;
}

const statuses = ["Новая", "В работе", "Завершена", "Выполнена"];

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState("kanban");
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>("");
  const [pendingDrag, setPendingDrag] = useState<DropResult | null>(null);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    // Добавляем или убираем класс для изменения отступов при сворачивании сайдбара
    if (sidebarCollapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }

    // Возвращаем отступы в нормальное состояние при монтировании компонента
    return () => document.body.classList.remove("sidebar-collapsed");
  }, [sidebarCollapsed]);

  const [searchQuery, setSearchQuery] = useState<string>("");

  // Только потом объявлять filteredTasks
  const filteredTasks = useMemo(() => {
    return Object.values(columns)
      .flat()
      .filter(
        (task) =>
          task.Task_Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.Description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.Order_Name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [columns, searchQuery]);

  const startEditingComment = (comment: CommentType) => {
    setEditingCommentId(comment.ID_Comment);
    setEditingCommentText(comment.CommentText);
  };

  const openCommentsModal = (task: Task) => {
    setViewingTask(task);
    setIsCommentsModalVisible(true);
    fetchComments(task.ID_Task);
  };

  const [newComment, setNewComment] = useState("");

  const fetchComments = async (taskId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/comments/${taskId}`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error("Ошибка при получении комментариев:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !viewingTask || !user?.id) {
      messageApi.error("Комментарий пустой или пользователь не найден.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      messageApi.error("Токен авторизации отсутствует.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // <-- добавлено
        },
        body: JSON.stringify({
          taskId: viewingTask.ID_Task,
          userId: user.id,
          commentText: newComment.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Ошибка:", result);
        messageApi.error(
          result.message || "Ошибка при добавлении комментария."
        );
        return;
      }

      setNewComment("");
      fetchComments(viewingTask.ID_Task);
      messageApi.success("Комментарий добавлен");
    } catch (error) {
      console.error("Ошибка при добавлении комментария:", error);
      messageApi.error("Ошибка при добавлении комментария.");
    }
  };

  const handleUpdateComment = async () => {
    const token = localStorage.getItem("token");
    if (!token || editingCommentId === null) return;

    try {
      const response = await fetch(
        `${API_URL}/api/comments/${editingCommentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ commentText: editingCommentText }),
        }
      );

      if (!response.ok) throw new Error("Ошибка при обновлении комментария");

      setEditingCommentId(null);
      setEditingCommentText("");
      fetchComments(viewingTask!.ID_Task);
      messageApi.success("Комментарий обновлен");
    } catch (error) {
      console.error(error);
      messageApi.error("Ошибка при обновлении комментария");
    }
  };
  const handleDeleteComment = async (commentId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Ошибка при удалении комментария");

      fetchComments(viewingTask!.ID_Task);
      messageApi.success("Комментарий удален");
    } catch (error) {
      console.error(error);
      messageApi.error("Ошибка при удалении комментария");
    }
  };

  useEffect(() => {
    if (viewingTask) {
      fetchComments(viewingTask.ID_Task);
    }
  }, [viewingTask]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewingTask?.ID_Task) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("taskId", viewingTask.ID_Task.toString());

    setSelectedFileName(file.name);

    try {
      const response = await fetch(`${API_URL}/api/upload-task`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Ошибка загрузки");

      const data = await response.json();
      messageApi.success("Файл загружен: " + data.filename);
      fetchTasks(); // обновим задачи после загрузки
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка загрузки файла");
    }
  };

  const getInitials = (fullName: string = "") => {
    const [first, second] = fullName.split(" ");
    return `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase();
  };

  const fetchTasks = useCallback(async () => {
    try {
      const url = `${API_URL}/api/tasks?employee=${user?.id}`;
      const response = await fetch(url);
      const data: Task[] = await response.json();

      const grouped: Record<string, Task[]> = {};
      statuses.forEach((status) => {
        grouped[status] = data.filter(
          (task) =>
            task.Status_Name === status &&
            task.Employees.some((emp) => emp.ID_Employee === user?.id)
        );
      });
      setColumns(grouped);
    } catch {
      messageApi.error("Не удалось загрузить задачи");
    }
  }, [user?.id, messageApi]);

  useEffect(() => {
    fetchTasks(); // первая загрузка

    const interval = setInterval(() => {
      fetchTasks(); // периодическая проверка
    }, 10000); // каждые 10 сек

    return () => clearInterval(interval); // очистка при размонтировании
  }, [fetchTasks]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const fromStatus = source.droppableId;
    const toStatus = destination.droppableId;

    // Restrict invalid transitions
    if (
      fromStatus === "Завершена" &&
      toStatus !== "Завершена" &&
      toStatus !== "Выполнена"
    ) {
      messageApi.warning(
        'Нельзя переместить задачу из статуса "Завершена" в выбранный статус'
      );
      return;
    }

    if (fromStatus === "Выполнена" && toStatus !== "Выполнена") {
      messageApi.warning(
        'Нельзя переместить задачу из "Выполнена" в другие статусы'
      );
      return;
    }

    // Trigger confirmation only when moving to Завершена or Выполнена
    if (["Завершена", "Выполнена"].includes(toStatus)) {
      setPendingDrag(result);
      setIsConfirmModalVisible(true);
    } else {
      confirmDragAction(result);
    }
  };

  const renderEmployees = (employees: Employee[]) => {
    if (!employees?.length) return "—";
    return (
      <Avatar.Group max={{ count: 3 }}>
        {employees.map((emp) => (
          <Tooltip key={emp.ID_Employee} title={emp.Full_Name || "—"}>
            <Avatar
              src={emp.Avatar ? `${API_URL}/uploads/${emp.Avatar}` : undefined}
              style={{ backgroundColor: emp.Avatar ? "transparent" : "#777" }}
            >
              {!emp.Avatar && getInitials(emp.Full_Name || "")}
            </Avatar>
          </Tooltip>
        ))}
      </Avatar.Group>
    );
  };

  
  const getDeadlineStatus = (task: Task) => {
    const now = dayjs();
    if (!task.Deadline) {
      return { label: "Без срока" };
    }

    const deadline = dayjs(task.Deadline);
    const isExpired = deadline.isBefore(now);
    const isSoon = deadline.diff(now, "hour") <= 24;

    if (task.Status_Name === "Выполнена") {
      return { label: "Выполнена" };
    }

    if (task.Status_Name === "Завершена") {
      return { label: "Завершена" };
    }

    if (isExpired) {
      return { label: "Срок истёк", color: "red" };
    }

    if (isSoon) {
      return {
        label: ` ${deadline.diff(now, "hour")} ч.`,
        color: "#b28a00",
      };
    }

    return {
      label: ` ${deadline.diff(now, "day")} дн.`,
      color: "#388e3c",
    };
  };

  const confirmDragAction = async (result: DropResult) => {
    const { draggableId, destination, source } = result;
    const taskId = parseInt(draggableId.replace("task-", ""), 10);
    const updatedStatus = destination?.droppableId;

    if (!updatedStatus) return;

    try {
      const response = await fetch(
        `${API_URL}/api/tasks/${taskId}/status?employeeId=${user?.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            employeeId: user?.id,
            statusName: updatedStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Ошибка при обновлении статуса");
      }

      // ✅ Только после успешного запроса — обновляем UI
      setColumns((prev) => {
        const newColumns = { ...prev };
        const fromStatus = source.droppableId;
        const toStatus = updatedStatus;

        const taskIndex = newColumns[fromStatus].findIndex(
          (t) => `task-${t.ID_Task}` === result.draggableId
        );

        if (taskIndex !== -1) {
          const [movedTask] = newColumns[fromStatus].splice(taskIndex, 1);
          movedTask.Status_Name = toStatus;
          newColumns[toStatus].push(movedTask);
        }

        return newColumns;
      });
    } catch (error) {
      messageApi.error("Ошибка при изменении статуса");
      console.error(error);
    } finally {
      setPendingDrag(null);
      setIsConfirmModalVisible(false);
    }
  };

  const tableColumns = [
    {
      title: <div style={{ textAlign: "center" }}>Проект</div>,
      dataIndex: "Order_Name",
      key: "Order_Name",
      filters: Array.from(new Set(filteredTasks.map((t) => t.Order_Name))).map(
        (value) => ({ text: value, value })
      ),
      onFilter: (value: string | number | boolean | React.Key, record: Task) =>
        record.Status_Name === value,

      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Название задачи</div>,
      dataIndex: "Task_Name",
      key: "Task_Name",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Описание</div>,
      dataIndex: "Description",
      key: "Description",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Норма времени (часы)</div>,
      dataIndex: "Time_Norm",
      key: "Time_Norm",
      render: (text: number) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Статус</div>,
      dataIndex: "Status_Name",
      key: "Status_Name",
      filters: Array.from(new Set(filteredTasks.map((t) => t.Status_Name))).map(
        (value) => ({ text: value, value })
      ),
      onFilter: (value: string | number | boolean | React.Key, record: Task) =>
        record.Status_Name === value,

      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Дедлайн</div>,
      dataIndex: "Deadline",
      key: "Deadline",
      render: (val: string | null) => (
        <div style={{ textAlign: "left" }}>
          {val ? dayjs(val).format("YYYY-MM-DD HH:mm") : "—"}
        </div>
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>Сотрудники</div>,
      dataIndex: "Employees",
      key: "Employees",
      render: (employees: Employee[]) => (
        <div style={{ textAlign: "left" }}>{renderEmployees(employees)}</div>
      ),
    },
  ];

  const openViewModal = (task: Task) => setViewingTask(task);
  const closeViewModal = () => setViewingTask(null);

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
    } catch (error) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      } else {
        messageApi.error("Неизвестная ошибка при экспорте данных");
      }
    }
  };


  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <App>
        <div className="dashboard">
          <HeaderEmployee />
          <div className="dashboard-body">
            <Sidebar role="employee" onCollapse={setSidebarCollapsed} />

            <main className="main-content kanban-board">
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  marginBottom: "24px",
                }}
              >
                Мои задачи
              </h1>
              {contextHolder}

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
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                            marginBottom: 16,
                          }}
                        >
                          <Input
                            placeholder="Поиск задач..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: "250px" }}
                          />

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
                                { key: "pdf", label: "Экспорт в PDF (.pdf)" },
                              ],
                            }}
                            placement="bottomRight"
                            arrow
                          >
                            <Button icon={<DownloadOutlined />}>Экспорт</Button>
                          </Dropdown>
                        </div>
                        <DragDropContext onDragEnd={handleDragEnd}>
                          <div
                            style={{
                              maxHeight: "calc(100vh - 250px)",
                              overflowY: "auto",
                              overflowX: "auto",
                            }}
                          >
                            {/* Заголовки статусов — в отдельных блоках */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: `repeat(${statuses.length}, minmax(300px, 1fr))`,
                                gap: "12px",
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

                            {/* Колонки задач */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: `repeat(${statuses.length}, minmax(300px, 1fr))`,
                                gap: "12px",
                                paddingInline: "4px",
                              }}
                            >
                              {statuses.map((status) => (
                                <Droppable key={status} droppableId={status}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "12px",
                                        minWidth: "300px",
                                        backgroundColor: "var(--card-bg-color)",
                                        borderRadius: "10px",
                                        padding: "12px",
                                        boxShadow:
                                          "0 4px 12px rgba(0, 0, 0, 0.2)",
                                      }}
                                    >
                                      {filteredTasks
                                        .filter(
                                          (task) => task.Status_Name === status
                                        )
                                        .map((task, index) => (
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
                                                  <strong>
                                                    {task.Task_Name}
                                                  </strong>
                                                  <p
                                                    style={{
                                                      fontSize: "12px",
                                                      fontStyle: "italic",
                                                      color: "#aaa",
                                                    }}
                                                  >
                                                    Выполнил: {user?.firstName}{" "}
                                                    {user?.lastName}
                                                  </p>
                                                  <p>{task.Description}</p>
                                                  <p>
                                                    <i>Проект:</i>{" "}
                                                    {task.Order_Name}
                                                  </p>

                                                  {/* Аватарки сотрудников */}
                                                  <div className="kanban-avatars">
                                                    {renderEmployees(
                                                      task.Employees
                                                    )}
                                                  </div>

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
      color: "#52c41a",
      fontWeight: "bold",
    }}
  >
    {task.Deadline
      ? dayjs(task.Deadline).format("DD.MM.YYYY HH:mm")
      : "Без срока"}
  </span>
</div>


                                                  <div
                                                    className="task-footer"
                                                    style={{
                                                      display: "flex",
                                                      justifyContent:
                                                        "space-between",
                                                      alignItems: "center",
                                                    }}
                                                  >
                                                    <div>
                                                      <Button
                                                        type="text"
                                                        icon={<EyeOutlined />}
                                                        onClick={() =>
                                                          openViewModal(task)
                                                        }
                                                        style={{
                                                          padding: 0,
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
                                                            task
                                                          )
                                                        }
                                                        style={{ padding: 0 }}
                                                      />
                                                    </div>
                                                    <div
                                                      style={{
                                                        backgroundColor:
                                                          getDeadlineStatus(
                                                            task
                                                          ).color,
                                                        color: "#fff",
                                                        borderRadius: "4px",
                                                        padding: "2px 6px",
                                                        fontSize: "12px",
                                                        minWidth: "90px",
                                                        textAlign: "center",
                                                      }}
                                                    >
                                                      <ClockCircleOutlined
                                                        style={{
                                                          marginRight: 4,
                                                        }}
                                                      />
                                                      {
                                                        getDeadlineStatus(task)
                                                          .label
                                                      }
                                                    </div>
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
                          </div>
                        </DragDropContext>
                      </>
                    ),
                  },
                  {
                    label: "Список задач (таблица)",
                    key: "table",
                    children: (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 16,
                            background: "transparent",
                            border: "none",
                            boxShadow: "none",
                            padding: 0,
                          }}
                        >
                          <Input
                            placeholder="Поиск задач..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: 200 }}
                          />
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
                                { key: "pdf", label: "Экспорт в PDF (.pdf)" },
                              ],
                            }}
                            placement="bottomRight"
                            arrow
                          >
                            <Button icon={<DownloadOutlined />}>Экспорт</Button>
                          </Dropdown>
                        </div>

                        <Table
                          dataSource={filteredTasks}
                          columns={tableColumns}
                          rowKey="ID_Task"
                        />
                      </>
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
                          key={`emp-view-${emp.ID_Employee}-${idx}`}
                          title={emp.Full_Name}
                        >
                          <Avatar
                            src={
                              emp.Avatar
                                ? `${API_URL}/uploads/${emp.Avatar}`
                                : undefined
                            }
                            style={{
                              backgroundColor: emp.Avatar
                                ? "transparent"
                                : "#777",
                              marginRight: 4,
                            }}
                          >
                            {!emp.Avatar && getInitials(emp.Full_Name || "")}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </div>
                    <p
                      style={{
                        marginTop: 8,
                        fontStyle: "italic",
                        color: "#aaa",
                      }}
                    >
                      Модуль данной задачи выполнил:{" "}
                      <strong>
                        {user?.firstName} {user?.lastName}
                      </strong>
                    </p>

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
                            {viewingTask.attachments.map(
                              (filename: string, idx: number) => (
                                <a
                                  key={`att-${idx}`}
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
                              )
                            )}
                          </div>
                        </>
                      )}

                    <p style={{ marginTop: "1rem" }}>
                      <strong>Загрузить новый файл:</strong>
                    </p>
                    <label
                      htmlFor="employee-upload"
                      style={{
                        display: "inline-block",
                        padding: "6px 14px",
                        backgroundColor: "#1f1f1f",
                        color: "#fff",
                        borderRadius: "6px",
                        cursor: "pointer",
                        border: "1px solid #444",
                        fontSize: "13px",
                      }}
                    >
                      📤 Выберите файл
                    </label>
                    <input
                      id="employee-upload"
                      type="file"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                    {selectedFileName && (
                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "12px",
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
                onCancel={() => setIsCommentsModalVisible(false)}
                footer={null}
              >
                {viewingTask && (
                  <>
                    <h3 style={{ marginTop: 0 }}>Комментарии:</h3>
                    <List
                      className="comment-list"
                      header={`${comments.length} комментариев`}
                      itemLayout="horizontal"
                      dataSource={comments}
                      renderItem={(item: CommentType) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                src={
                                  item.Avatar
                                    ? `${API_URL}/uploads/${item.Avatar}`
                                    : undefined
                                }
                                style={{
                                  backgroundColor: item.Avatar
                                    ? "transparent"
                                    : "#777",
                                }}
                              >
                                {!item.Avatar &&
                                  getInitials(item.AuthorName || "")}
                              </Avatar>
                            }
                            title={
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  flexWrap: "wrap", // 👈 Добавляем перенос, если не хватает места
                                  gap: "8px",
                                  width: "100%",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: "#fff",
                                    whiteSpace: "normal", // 👈 Разрешаем перенос текста
                                    wordBreak: "break-word",
                                    flex: "1 1 auto", // 👈 Имя автора может занимать доступное место
                                  }}
                                >
                                  {item.AuthorName}
                                </span>
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "#999",
                                    whiteSpace: "nowrap", // 👈 Дата не переносится
                                    flexShrink: 0, // 👈 Дата не сжимается
                                  }}
                                >
                                  {dayjs(item.Created_At).format(
                                    "YYYY-MM-DD HH:mm"
                                  )}
                                </span>
                              </div>
                            }
                            description={
                              <>
                                {editingCommentId === item.ID_Comment ? (
                                  <Input.TextArea
                                    value={editingCommentText}
                                    onChange={(e) =>
                                      setEditingCommentText(e.target.value)
                                    }
                                    autoSize
                                  />
                                ) : (
                                  <div
                                    className="comment-text"
                                    style={{
                                      color: "#fff",
                                      whiteSpace: "normal", // 👈 Разрешаем перенос текста
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {item.CommentText.replace(
                                      /(\r\n|\n|\r)/g,
                                      " "
                                    ).trim()}
                                  </div>
                                )}

                                <div
                                  style={{
                                    marginTop: 8,
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: 8,
                                  }}
                                >
                                  {editingCommentId === item.ID_Comment ? (
                                    <>
                                      <Button
                                        type="primary"
                                        size="small"
                                        style={{ color: "#fff" }}
                                        onClick={() => handleUpdateComment()}
                                      >
                                        Сохранить
                                      </Button>
                                      <Button
                                        size="small"
                                        style={{ color: "#fff" }}
                                        onClick={() =>
                                          setEditingCommentId(null)
                                        }
                                      >
                                        Отмена
                                      </Button>
                                    </>
                                  ) : (
                                    item.ID_User === user?.id && (
                                      <>
                                        <Button
                                          type="link"
                                          size="small"
                                          style={{ color: "#fff" }}
                                          onClick={() =>
                                            startEditingComment(item)
                                          }
                                          icon={<EditOutlined />}
                                        />
                                        <Button
                                          type="link"
                                          size="small"
                                          style={{ color: "#fff" }}
                                          danger
                                          onClick={() =>
                                            handleDeleteComment(item.ID_Comment)
                                          }
                                          icon={<DeleteOutlined />}
                                        />
                                      </>
                                    )
                                  )}
                                </div>
                              </>
                            }
                          />
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
              <Modal
                title="Подтвердите действие"
                open={isConfirmModalVisible}
                onOk={() => {
                  if (pendingDrag) confirmDragAction(pendingDrag);
                  setIsConfirmModalVisible(false);
                }}
                onCancel={() => {
                  setIsConfirmModalVisible(false);
                  setPendingDrag(null);
                }}
                okText="Подтвердить"
                cancelText="Отмена"
              >
                <p>
                  Вы уверены, что хотите переместить задачу в статус "
                  {pendingDrag?.destination?.droppableId}"?
                  <br />
                  После перетаскивания карточки в данный статус, действие нельзя
                  будет отменить!
                </p>
              </Modal>
            </main>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default EmployeeDashboard;
