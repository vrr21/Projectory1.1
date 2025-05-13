import React, { useEffect, useState, useCallback, useMemo } from 'react';

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
import '../styles/pages/ManagerDashboard.css';

import { Input, List } from 'antd';
import { MessageOutlined } from '@ant-design/icons';

import { DownloadOutlined} from '@ant-design/icons';
import { Dropdown } from 'antd';



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


const statuses = ['Новая', 'В работе', 'Завершена', 'Выполнена'];

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState('kanban');
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');
  const [pendingDrag, setPendingDrag] = useState<DropResult | null>(null);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  

  const [searchQuery, setSearchQuery] = useState<string>('');

// Только потом объявлять filteredTasks
const filteredTasks = useMemo(() => {
  return Object.values(columns)
    .flat()
    .filter((task) =>
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
  
  const [newComment, setNewComment] = useState('');
  
  
  const fetchComments = async (taskId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/comments/${taskId}`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Ошибка при получении комментариев:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !viewingTask || !user?.id) {
      messageApi.error('Комментарий пустой или пользователь не найден.');
      return;
    }
  
    const token = localStorage.getItem('token');
    if (!token) {
      messageApi.error('Токен авторизации отсутствует.');
      return;
    }
  
    try {
      const response = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // <-- добавлено
        },
        body: JSON.stringify({
          taskId: viewingTask.ID_Task,
          userId: user.id,
          commentText: newComment.trim(),
        }),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        console.error('Ошибка:', result);
        messageApi.error(result.message || 'Ошибка при добавлении комментария.');
        return;
      }
  
      setNewComment('');
      fetchComments(viewingTask.ID_Task);
      messageApi.success('Комментарий добавлен');
    } catch (error) {
      console.error('Ошибка при добавлении комментария:', error);
      messageApi.error('Ошибка при добавлении комментария.');
    }
  };
  
  const handleUpdateComment = async () => {
    const token = localStorage.getItem('token');
    if (!token || editingCommentId === null) return;
  
    try {
      const response = await fetch(`${API_URL}/api/comments/${editingCommentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ commentText: editingCommentText }),
      });
      
  
      if (!response.ok) throw new Error('Ошибка при обновлении комментария');
      
      setEditingCommentId(null);
      setEditingCommentText('');
      fetchComments(viewingTask!.ID_Task);
      messageApi.success('Комментарий обновлен');
    } catch (error) {
      console.error(error);
      messageApi.error('Ошибка при обновлении комментария');
    }
  };
  const handleDeleteComment = async (commentId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
  
    try {
      const response = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
  
      if (!response.ok) throw new Error('Ошибка при удалении комментария');
      
      fetchComments(viewingTask!.ID_Task);
      messageApi.success('Комментарий удален');
    } catch (error) {
      console.error(error);
      messageApi.error('Ошибка при удалении комментария');
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
    formData.append('file', file);
    formData.append('taskId', viewingTask.ID_Task.toString());

    setSelectedFileName(file.name);

    try {
      const response = await fetch(`${API_URL}/api/upload-task`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Ошибка загрузки');

      const data = await response.json();
      messageApi.success('Файл загружен: ' + data.filename);
      fetchTasks(); // обновим задачи после загрузки
    } catch (err) {
      console.error(err);
      messageApi.error('Ошибка загрузки файла');
    }
  };

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

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
  
    if (['Завершена', 'Выполнена'].includes(destination.droppableId)) {
      setPendingDrag(result);
      setIsConfirmModalVisible(true);
    } else {
      confirmDragAction(result);
    }
  };
  
  const confirmDragAction = async (result: DropResult) => {
    const { draggableId, destination } = result;
    const taskId = parseInt(draggableId, 10);
    const updatedStatus = destination?.droppableId;
  
    try {
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status_Name: updatedStatus }),
      });
      fetchTasks();
    } catch {
      messageApi.error('Ошибка при изменении статуса задачи');
    } finally {
      setPendingDrag(null);
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

  const renderDeadlineBox = (deadline: string | null | undefined, status?: string) => {
    if (status === 'Завершена') {
      return (
        <div className="deadline-box">
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          Завершена
        </div>
      );
    }
  
    if (status === 'Выполнена') {
      return (
        <div className="deadline-box">
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          Выполнено
        </div>
      );
    }
  
    if (!deadline) {
      return (
        <div className="deadline-box undefined">
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          Без срока
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
  {
    title: <div style={{ textAlign: 'center' }}>Проект</div>,
    dataIndex: 'Order_Name',
    key: 'Order_Name',
    filters: Array.from(new Set(filteredTasks.map(t => t.Order_Name)))
      .map(value => ({ text: value, value })),
      onFilter: (value: string | number | boolean | React.Key, record: Task) => record.Status_Name === value,

    render: (text: string) => <div style={{ textAlign: 'left' }}>{text}</div>,
  },
  {
    title: <div style={{ textAlign: 'center' }}>Название задачи</div>,
    dataIndex: 'Task_Name',
    key: 'Task_Name',
    render: (text: string) => <div style={{ textAlign: 'left' }}>{text}</div>,
  },
  {
    title: <div style={{ textAlign: 'center' }}>Описание</div>,
    dataIndex: 'Description',
    key: 'Description',
    render: (text: string) => <div style={{ textAlign: 'left' }}>{text}</div>,
  },
  {
    title: <div style={{ textAlign: 'center' }}>Норма времени (часы)</div>,
    dataIndex: 'Time_Norm',
    key: 'Time_Norm',
    render: (text: number) => <div style={{ textAlign: 'left' }}>{text}</div>,
  },
  {
    title: <div style={{ textAlign: 'center' }}>Статус</div>,
    dataIndex: 'Status_Name',
    key: 'Status_Name',
    filters: Array.from(new Set(filteredTasks.map(t => t.Status_Name)))
      .map(value => ({ text: value, value })),
      onFilter: (value: string | number | boolean | React.Key, record: Task) => record.Status_Name === value,

    render: (text: string) => <div style={{ textAlign: 'left' }}>{text}</div>,
  },
  {
    title: <div style={{ textAlign: 'center' }}>Дедлайн</div>,
    dataIndex: 'Deadline',
    key: 'Deadline',
    render: (val: string | null) =>
      <div style={{ textAlign: 'left' }}>
        {val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '—'}
      </div>,
  },
  {
    title: <div style={{ textAlign: 'center' }}>Сотрудники</div>,
    dataIndex: 'Employees',
    key: 'Employees',
    render: (employees: Employee[]) => (
      <div style={{ textAlign: 'left' }}>
        {renderEmployees(employees)}
      </div>
    ),
  },
];


  const openViewModal = (task: Task) => setViewingTask(task);
  const closeViewModal = () => setViewingTask(null);

const handleExport = async (format: string) => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/export/tasks?format=${format}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: '*/*',
      },
    });

    if (!res.ok) throw new Error('Ошибка при экспорте');

    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = `tasks_export.${format === 'word' ? 'docx' : format}`;

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    if (error instanceof Error) {
      messageApi.error(error.message);
    } else {
      messageApi.error('Неизвестная ошибка при экспорте данных');
    }
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
              <h2 className="dashboard-title">Мои задачи</h2>
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
                      <>
                        <div
                          className="sticky-toolbar"
                          style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 10,
                            padding: '8px 0',
                            backgroundColor: 'transparent',
                            borderBottom: 'none',
                            boxShadow: 'none',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                            marginBottom: 16,
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
                                { key: 'word', label: 'Экспорт в Word' },
                                { key: 'excel', label: 'Экспорт в Excel' },
                                { key: 'pdf', label: 'Экспорт в PDF' },
                              ],
                            }}
                            placement="bottomRight"
                            arrow
                          >
                            <Button icon={<DownloadOutlined />}>Экспорт</Button>
                          </Dropdown>
                        </div>
                
                        <DragDropContext onDragEnd={handleDragEnd}>
  <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', overflowX: 'auto' }}>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statuses.length}, minmax(300px, 1fr))`, gap: '16px' }}>
      {statuses.map((status) => (
        <Droppable key={status} droppableId={status}>
          {(provided) => (
       <div
       ref={provided.innerRef}
       {...provided.droppableProps}
       style={{
         display: 'flex',
         flexDirection: 'column',
         gap: '16px',
         minWidth: '300px',
         backgroundColor: '#1a1a1a',
         borderRadius: '10px',
         padding: '1rem',
         boxShadow: '0 4px 12px rgba(59, 59, 59, 0.2)',
       }}
     >
     
  <div
    key={`header-${status}`}
    className="kanban-status-header"
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      // ✅ Удалено: border: '1px solid #444',
    }}
  >
                {status}
              </div>

              {filteredTasks
                .filter((task) => task.Status_Name === status)
                .map((task, index) => (
                  <Draggable
                    key={`${task.ID_Task}`}
                    draggableId={`${task.ID_Task}`}
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
                          <p><i>Проект:</i> {task.Order_Name}</p>
                          <div className="kanban-avatars">
                            {renderEmployees(task.Employees)}
                          </div>
                          <div className="task-footer">
                            <Button
                              type="text"
                              icon={<EyeOutlined />}
                              onClick={() => openViewModal(task)}
                              style={{ padding: 0, marginRight: 8 }}
                            />
                            <Button
                              type="text"
                              icon={<MessageOutlined />}
                              onClick={() => openCommentsModal(task)}
                              style={{ padding: 0 }}
                            />
                            {renderDeadlineBox(task.Deadline, task.Status_Name)}
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
                    label: 'Список задач (таблица)',
                    key: 'table',
                    children: (
                      <>
                        <div
  style={{
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
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
                                { key: 'word', label: 'Экспорт в Word' },
                                { key: 'excel', label: 'Экспорт в Excel' },
                                { key: 'pdf', label: 'Экспорт в PDF' },
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

                    {viewingTask.attachments && viewingTask.attachments.length > 0 && (
                      <>
                        <p><strong>Файлы:</strong></p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {viewingTask.attachments.map((filename: string, idx: number) => (
                            <a
                              key={`att-${idx}`}
                              href={`${API_URL}/uploads/${filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-block',
                                backgroundColor: '#2a2a2a',
                                color: '#fff',
                                textDecoration: 'none',
                                padding: '4px 8px',
                                borderRadius: 4,
                                fontSize: 12
                              }}
                            >
                              📎 {filename}
                            </a>
                          ))}
                        </div>
                      </>
                    )}

                    <p style={{ marginTop: '1rem' }}><strong>Загрузить новый файл:</strong></p>
                    <label
                      htmlFor="employee-upload"
                      style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        backgroundColor: '#1f1f1f',
                        color: '#fff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: '1px solid #444',
                        fontSize: '13px'
                      }}
                    >
                      📤 Выберите файл
                    </label>
                    <input
                      id="employee-upload"
                      type="file"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    {selectedFileName && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#aaa' }}>
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
        src={item.Avatar ? `${API_URL}/uploads/${item.Avatar}` : undefined}
        icon={!item.Avatar ? <UserOutlined /> : undefined}
        style={{ backgroundColor: item.Avatar ? 'transparent' : '#777' }}
      />
    }
    title={
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, color: '#fff' }}>{item.AuthorName}</span>
        <span style={{ fontSize: 12, color: '#999' }}>
          {dayjs(item.Created_At).format('YYYY-MM-DD HH:mm')}
        </span>
      </div>
    }
    description={
      <>
        {editingCommentId === item.ID_Comment ? (
          <Input.TextArea
            value={editingCommentText}
            onChange={(e) => setEditingCommentText(e.target.value)}
            autoSize
          />
        ) : (
          <div style={{ color: '#fff' }}>{item.CommentText}</div>
        )}

        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {editingCommentId === item.ID_Comment ? (
            <>
              <Button
                type="primary"
                size="small"
                style={{ color: '#fff' }}
                onClick={() => handleUpdateComment()}
              >
                Сохранить
              </Button>
              <Button
                size="small"
                style={{ color: '#fff' }}
                onClick={() => setEditingCommentId(null)}
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
                  style={{ color: '#fff' }}
                  onClick={() => startEditingComment(item)}
                >
                  Редактировать
                </Button>
                <Button
                  type="link"
                  size="small"
                  style={{ color: '#fff' }}
                  danger
                  onClick={() => handleDeleteComment(item.ID_Comment)}
                >
                  Удалить
                </Button>
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
  <p>Вы уверены, что хотите переместить задачу в статус "{pendingDrag?.destination?.droppableId}"?</p>
</Modal>

            </main>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default EmployeeDashboard;
