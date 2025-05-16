import React, { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  Upload,
  notification,
  Modal,
  App,
  Tooltip,
  InputNumber,
} from "antd";
import {
  InboxOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { UploadFile } from "antd/es/upload/interface";
import HeaderEmployee from "../components/HeaderEmployee";
import Sidebar from "../components/Sidebar";
import "../styles/pages/TimeTrackingEmployee.css";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";
import localeData from "dayjs/plugin/localeData";
import "dayjs/locale/ru";
import { MessageOutlined, UserOutlined } from "@ant-design/icons";
import { List, Avatar } from "antd";

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
}

interface TimeTrackingFormValues {
  project: string;
  taskName: string;
  description: string;
  hours: number;
  date: dayjs.Dayjs;
  file: UploadFile[];
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
  ID_User: string; // Добавьте это поле
}

interface CommentType {
  ID_Comment: number;
  CommentText: string;
  Created_At: string;
  AuthorName: string;
  Avatar?: string;
}

const TimeTrackingEmployee: React.FC = () => {
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
    const res = await fetch(`${API_URL}/api/tasks`);
    setTasks(await res.json());
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
    const userEntries = allEntries.filter(
      (entry) => entry.ID_User === userData.ID_User
    );
    setTimeEntries(userEntries);
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchTasks();
    fetchTimeEntries();
  }, [fetchProjects, fetchTasks, fetchTimeEntries]);

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

    setEditingFileList(fileList);
    setEditingEntry({ ...entry, Attachments: entry.Attachments || [] });

    form.setFieldsValue({
      project,
      taskName: entry.ID_Task,
      hours: entry.Hours_Spent,
      date: dayjs(entry.Start_Date),
      description: entry.Description || "",
      file: fileList,
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

  const handleFormSubmit = async (values: TimeTrackingFormValues) => {
    const token = localStorage.getItem("token");
    const payload = {
      project: values.project,
      taskName: values.taskName,
      date: values.date.toISOString(),
      description: values.description,
      hours: values.hours,
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

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Ошибка ${res.status}: ${errorText}`);
      }

      api.success({
        message: editingEntry ? "Запись обновлена" : "Время добавлено",
      });

      if (values.file?.length) {
        for (const file of values.file) {
          const formData = new FormData();
          formData.append("file", file.originFileObj as File);
          formData.append("taskId", values.taskName);

          try {
            const uploadRes = await fetch(`${API_URL}/api/upload-task`, {
              method: "POST",
              body: formData,
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!uploadRes.ok) {
              throw new Error("Ошибка при загрузке файла");
            }

            const uploadData = await uploadRes.json();
            api.success({ message: "Файл прикреплён: " + uploadData.filename });
          } catch (uploadErr) {
            console.error(uploadErr);
            api.error({ message: "Ошибка при загрузке файла" });
          }
        }
      }

      fetchTimeEntries();
      form.resetFields();
      setEditingEntry(null);
      setIsModalVisible(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        api.error({ message: `Ошибка при сохранении: ${error.message}` });
      } else {
        api.error({ message: "Неизвестная ошибка при сохранении" });
      }
    }
  };

  const fetchComments = async (taskId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/comments/${taskId}`);
      const data = await res.json();
      setComments(data);
    } catch (error) {
      console.error("Ошибка при получении комментариев:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !viewingEntry?.ID_Task) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskId: viewingEntry.ID_Task,
          commentText: newComment.trim(),
        }),
      });

      if (!res.ok) throw new Error();
      setNewComment("");
      fetchComments(viewingEntry.ID_Task);
    } catch (error) {
      console.error("Ошибка при добавлении комментария:", error);
    }
  };

  const openCommentsModal = (entry: RawTimeEntry) => {
    setViewingEntry(entry);
    setIsCommentsModalVisible(true);
    fetchComments(entry.ID_Task);
  };
  const handleViewEntry = async (entry: RawTimeEntry) => {
    try {
      const res = await fetch(
        `${API_URL}/api/tasks/${entry.ID_Task}/attachments`
      );
      if (!res.ok) {
        throw new Error(`Ошибка загрузки вложений: ${res.status}`);
      }

      const data = await res.json();
      setViewingEntry({ ...entry, Attachments: data.attachments || [] });
    } catch (error) {
      console.error("Ошибка при получении вложений:", error);
      setViewingEntry({ ...entry, Attachments: [] });
    } finally {
      setIsViewModalVisible(true);
    }
  };

  const getWeekDays = () =>
    Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));

  const getEntriesByDay = (day: dayjs.Dayjs) =>
    timeEntries.filter((entry) => dayjs(entry.Start_Date).isSame(day, "day"));

  const normFile = (e: { fileList: UploadFile[] }) =>
    Array.isArray(e) ? e : e.fileList;
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <App>
      {contextHolder}
      <Layout className="layout">
        <Sidebar role="employee" />
        <Layout className="main-layout">
          <HeaderEmployee />
          <Content className="content">
            <div className="page-content">
              <div
                className="time-tracking-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 24,
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <h1
                  style={{
                    fontSize: "28px",
                    fontWeight: 600,
                    marginBottom: 0,
                    flexBasis: "100%",
                  }}
                >
                  Учёт времени
                </h1>
                <Button
                  icon={<LeftOutlined />}
                  onClick={() => setWeekStart(weekStart.subtract(1, "week"))}
                />
                <h2 style={{ margin: "0 1rem" }}>
                  {weekStart.format("D MMMM")} –{" "}
                  {weekStart.add(6, "day").format("D MMMM YYYY")}
                </h2>
                <Button
                  icon={<RightOutlined />}
                  onClick={() => setWeekStart(weekStart.add(1, "week"))}
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
                    current && (current.year() < 2000 || current.year() > 2100)
                  }
                />
                <Button
                  className="add-time-button"
                  onClick={() => {
                    form.resetFields();
                    setEditingEntry(null);
                    setIsModalVisible(true);
                  }}
                >
                  Добавить потраченное время
                </Button>
              </div>

              <div className="horizontal-columns">
                {getWeekDays().map((day) => (
                  <div key={day.toString()} className="horizontal-column">
                    <div className="day-header">
                      {weekDaysRu[day.isoWeekday() - 1]}
                    </div>
                    <div className="day-date">{day.format("DD.MM")}</div>
                    <div className="card-stack">
                      {getEntriesByDay(day)
                        .filter((entry) => entry.ID_User === user?.id)
                        .map((entry) => (
                          <div key={entry.ID_Execution} className="entry-card">
                            <div>
                              <b>{entry.Task_Name}</b>
                              <div>Проект: {entry.Order_Name}</div>
                              <div>{entry.Hours_Spent} ч</div>
                            </div>

                            <div
                              style={{
                                marginTop: 8,
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <Tooltip title="Просмотр">
                                <Button
                                  icon={<EyeOutlined />}
                                  onClick={() => handleViewEntry(entry)}
                                />
                              </Tooltip>
                              <Tooltip title="Редактировать">
                                <Button
                                  icon={<EditOutlined />}
                                  onClick={() => handleEdit(entry)}
                                />
                              </Tooltip>
                              <Tooltip title="Удалить">
                                <Button
                                  icon={<DeleteOutlined />}
                                  danger
                                  onClick={() =>
                                    handleDelete(entry.ID_Execution)
                                  }
                                />
                              </Tooltip>
                              <Tooltip title="Комментарии">
                                <Button
                                  icon={<MessageOutlined />}
                                  onClick={() => openCommentsModal(entry)}
                                />
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <Modal
                title={editingEntry ? "Редактировать" : "Добавить"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
              >
                <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
                  <Form.Item
                    name="project"
                    label="Проект"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Выберите проект">
                      {projects.map((p) => (
                        <Select.Option key={p.ID_Order} value={p.ID_Order}>
                          {p.Order_Name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="taskName"
                    label="Задача"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Выберите задачу">
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

                  <Form.Item
                    name="hours"
                    label="Потрачено часов"
                    rules={[
                      { required: true, message: "Введите количество часов" },
                      {
                        validator: (_, value) =>
                          value > 0
                            ? Promise.resolve()
                            : Promise.reject("Часы должны быть больше 0"),
                      },
                    ]}
                  >
                    <InputNumber
                      className="hours-input"
                      min={0.1}
                      step={0.1}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="date"
                    label="Дата"
                    rules={[{ required: true, message: "Выберите дату" }]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      disabledDate={(current) =>
                        current && current > dayjs().endOf("day")
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    label="Прикрепить файлы"
                    name="file"
                    valuePropName="fileList"
                    getValueFromEvent={normFile}
                  >
                    <Upload
                      beforeUpload={() => false}
                      multiple
                      accept=".pdf,.doc,.docx,.png,.jpg"
                      fileList={editingFileList}
                      onChange={({ fileList }) => setEditingFileList(fileList)}
                    >
                      <Button icon={<InboxOutlined />}>Выберите файлы</Button>
                    </Upload>
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      {editingEntry ? "Сохранить изменения" : "Добавить время"}
                    </Button>
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
                      <b>Потрачено:</b> {viewingEntry.Hours_Spent} ч
                    </p>
                    {viewingEntry.Description && (
                      <p>
                        <b>Описание:</b> {viewingEntry.Description}
                      </p>
                    )}
                    {viewingEntry.Attachments &&
                      viewingEntry.Attachments.length > 0 && (
                        <>
                          <ul className="attachments-list">
                            {viewingEntry.Attachments.map((filename, idx) => (
                              <li key={idx}>
                                <a
                                  href={`${API_URL}/uploads/${filename}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {filename}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </>
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
                {viewingEntry && (
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
                                icon={
                                  !item.Avatar ? <UserOutlined /> : undefined
                                }
                                style={{
                                  backgroundColor: item.Avatar
                                    ? "transparent"
                                    : "#777",
                                }}
                              />
                            }
                            title={
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>{item.AuthorName}</span>
                                <span style={{ fontSize: 12, color: "#999" }}>
                                  {dayjs(item.Created_At).format(
                                    "YYYY-MM-DD HH:mm"
                                  )}
                                </span>
                              </div>
                            }
                            description={item.CommentText}
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
            </div>
          </Content>
        </Layout>
      </Layout>
    </App>
  );
};

export default TimeTrackingEmployee;
