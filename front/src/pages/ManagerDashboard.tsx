import React, { useEffect, useState, useCallback, useMemo } from 'react';

import {
  App, Button, ConfigProvider, Form, Input, Modal, Select, Table, Tooltip, message,
  theme, Avatar, Tabs, DatePicker, InputNumber, Upload
} from 'antd';

import {
  UserOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ClockCircleOutlined, UploadOutlined, FilterOutlined, 
} from '@ant-design/icons';
import { MessageOutlined } from '@ant-design/icons';

import dayjs from 'dayjs';
import HeaderManager from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import '../styles/pages/ManagerDashboard.css';
import '@ant-design/v5-patch-for-react-19';
import type { UploadFile } from 'antd/es/upload';
import { Dropdown} from 'antd';  
import { DownloadOutlined } from '@ant-design/icons';

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
}

interface Team {
  ID_Team: number;
  Team_Name: string;
  members: TeamMember[];
  IsArchived?: boolean;  // добавлено
}


interface TeamMember {
  id: number;
  fullName: string;
  avatar?: string;
}

interface Status {
  ID_Status: number;
  Status_Name: string;
}

interface Project {
  ID_Order: number;
  Order_Name: string;
  ID_Team: number;
  IsArchived?: boolean;  // добавлено
  Deadline?: string | null; // добавлено
}


const statuses = ['Новая', 'В работе', 'Завершена', 'Выполнена'];

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
  const [activeTab, setActiveTab] = useState('kanban');
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [pendingDragTask, setPendingDragTask] = useState<{
    taskId: number;
    targetStatusId: number;
    targetStatusName: string;
  } | null>(null);
  
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  
  const [selectedFiles, setSelectedFiles] = useState<UploadFile<File>[]>([]);
  const [filterTeam, setFilterTeam] = useState<number | null>(null);
  const [filterProject, setFilterProject] = useState<number | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);
  const [comments, setComments] = useState<{
    ID_Comment: number;
    CommentText: string;
    Created_At: string;
    AuthorName: string;
    ID_User: number;
    Avatar?: string;
  }[]>([]);
  
  const [newComment, setNewComment] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user?.id ?? null;

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
 const [editedCommentText, setEditedCommentText] = useState('');

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

    // Извлекаем имя файла из заголовков
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      messageApi.error(error.message);
    } else {
      messageApi.error('Неизвестная ошибка при экспорте данных');
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
      messageApi.error('Ошибка при загрузке комментариев');
    }
  };
  
  const submitComment = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id ?? null;
  
    if (!newComment.trim()) {
      messageApi.error('Комментарий не может быть пустым');
      return;
    }
  
    if (!currentTaskId) {
      messageApi.error('ID задачи не определён');
      return;
    }
  
    if (!userId || userId <= 0) {
      messageApi.error('ID пользователя отсутствует или некорректен');
      return;
    }
  
    const payload = {
      taskId: currentTaskId,
      userId,
      commentText: newComment.trim()
    };
  
    try {
      const res = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
  
      if (!res.ok) throw new Error(`Ошибка: ${res.status} — ${await res.text()}`);
  
      setNewComment('');
      openCommentsModal(currentTaskId);
      messageApi.success('Комментарий добавлен');
    } catch (err) {
      messageApi.error('Ошибка при отправке комментария');
      console.error('submitComment error:', err);
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
        placeholder="Фильтр по команде"
        style={{ width: '100%', marginBottom: 8 }}
        onChange={(val) => setFilterTeam(val)}
        value={filterTeam ?? undefined}
      >
{teams
  .filter(team => !team.IsArchived)
  .map(team => (
    <Option key={team.ID_Team} value={team.ID_Team}>
      {team.Team_Name}
    </Option>
))}

      </Select>
  
      <Select
        allowClear
        placeholder="Фильтр по проекту"
        style={{ width: '100%', marginBottom: 8 }}
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
        style={{ width: '100%', marginBottom: 8 }}
        onChange={(val) => setFilterEmployee(val)}
        value={filterEmployee ?? undefined}
        optionFilterProp="children"
      >
        {[...new Set(tasks.flatMap(task => task.Employees.map(emp => emp.fullName)))].sort().map((name) => (
          <Option key={name} value={name}>
            {name}
          </Option>
        ))}
      </Select>
  
      <Button
        onClick={clearFilters}
        style={{
          width: '100%',
          fontSize: '12px',
          padding: '4px 0',
          marginTop: 4,
          backgroundColor: '#f5f5f5',
          color: '#000',
          border: '1px solid #ccc'
        }}
      >
        Сбросить фильтры
      </Button>
    </div>
  );
  


  const getInitials = (fullName: string) => {
    const [first, second] = fullName.split(' ');
    return `${first?.[0] ?? ''}${second?.[0] ?? ''}`.toUpperCase();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewingTask?.ID_Task) return;
  
    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', viewingTask.ID_Task.toString());
  
    setSelectedFileName(file.name); // ✅ Добавлено
  
    try {
      const response = await fetch('http://localhost:3002/api/upload-task', {
        method: 'POST',
        body: formData
      });
  
      if (!response.ok) throw new Error('Ошибка загрузки');
  
      const data = await response.json();
      alert('Файл загружен: ' + data.filename);
    } catch (err) {
      console.error('Ошибка загрузки файла:', err);
      alert('Ошибка загрузки файла');
    }
  };
  
  const tableColumns = [
    { title: 'Проект', dataIndex: 'Order_Name', key: 'Order_Name' },
    { title: 'Название задачи', dataIndex: 'Task_Name', key: 'Task_Name' },
    { title: 'Описание', dataIndex: 'Description', key: 'Description' },
    { title: 'Норма времени (часы)', dataIndex: 'Time_Norm', key: 'Time_Norm' },
    {
      title: 'Дедлайн',
      dataIndex: 'Deadline',
      key: 'Deadline',
      render: (date: string) => {
        return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '—';
      }
    },
    {
      title: 'Сотрудники',
      key: 'Employees',
      render: (_: unknown, task: Task) => (
        <div className="kanban-avatars">
          {task.Employees?.length
            ? task.Employees.map(emp => (
                <Tooltip key={emp.id} title={emp.fullName}>
                 <Avatar
  src={emp.avatar ? `${API_URL}/uploads/${emp.avatar}` : undefined}
  style={{ backgroundColor: emp.avatar ? 'transparent' : '#777' }}
>
  {!emp.avatar && getInitials(emp.fullName)}
</Avatar>

                </Tooltip>
              ))
            : 'Не назначен'}
        </div>
      ),
    },
    { title: 'Статус', dataIndex: 'Status_Name', key: 'Status_Name' },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: unknown, task: Task) => (
        <div className="task-actions">
          <Tooltip title="Редактировать">
            <Button
              icon={<EditOutlined />}
              onClick={() => showModal(task)}
              size="small"
              style={{
                marginRight: 8,
                backgroundColor: 'transparent', // Убирает фон
                border: 'none', // Убирает обводку
                color: 'inherit', // Устанавливает цвет текста по умолчанию
                padding: 0 // Убирает лишние отступы
              }}
            />
          </Tooltip>
          <Tooltip title="Удалить">
            <Button
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(task.ID_Task)}
              size="small"
              danger
              style={{
                backgroundColor: 'transparent', // Убирает фон
                border: 'none', // Убирает обводку
                color: 'inherit', // Устанавливает цвет текста по умолчанию
                padding: 0 // Убирает лишние отступы
              }}
            />
          </Tooltip>
        </div>
      ),
    }
    
  ];

  const fetchAll = useCallback(async () => {
    try {
      const [resTasks, resTeams, resStatuses, resProjects] = await Promise.all([
        fetch(`${API_URL}/api/taskdetails/with-details`),
        fetch(`${API_URL}/api/teams`),
        fetch(`${API_URL}/api/statuses`),
        fetch(`${API_URL}/api/projects`)
      ]);
  
      const [tasksData, teamsData, statusesDataRaw, projectsData] = await Promise.all([
        resTasks.json(), resTeams.json(), resStatuses.json(), resProjects.json()
      ]);
      console.log('Fetched raw teams:', JSON.stringify(teamsData, null, 2));


      const completedStatusId = statusesDataRaw.find((s: Status) => s.Status_Name === 'Завершён')?.ID_Status;
  
      const updatedTasks: Task[] = [];
      for (const task of tasksData) {
        const isOverdue = task.Deadline && dayjs(task.Deadline).isBefore(dayjs());
        const needsUpdate = isOverdue && task.Status_Name !== 'Завершён' && completedStatusId;
  
        if (needsUpdate) {
          try {
            const res = await fetch(`${API_URL}/api/tasks/${task.ID_Task}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ID_Status: completedStatusId }),
            });
        
            if (res.ok) {
              updatedTasks.push({ ...task, Status_Name: 'Завершена', AutoCompleted: true }); // Отметка авто
              continue;
            }
          } catch (err) {
            console.error(`Ошибка при авто-завершении задачи ID ${task.ID_Task}:`, err);
          }
        }
        
  
        updatedTasks.push(task);
      }
  
      setTasks(updatedTasks);
      const activeTeams = teamsData.filter((team: Team) => !team.IsArchived);
      setTeams(activeTeams);
      
      setStatusesData(statusesDataRaw);
      setProjects(projectsData);
    } catch (err) {
      console.error(err);
      messageApi.error('Ошибка при загрузке данных');
    }
  }, [messageApi]);
  
  
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  
  useEffect(() => {
    const autoUpdateOverdueTasks = async () => {
      const overdueTasks = tasks.filter(task =>
        task.Deadline && dayjs(task.Deadline).isBefore(dayjs()) &&
        (task.Status_Name === 'Новая' || task.Status_Name === 'В работе')
      );
  
      if (overdueTasks.length === 0) return;
  
      const completedStatus = statusesData.find(s => s.Status_Name === 'Завершена');
      if (!completedStatus) return;
  
      for (const task of overdueTasks) {
        try {
          const res = await fetch(`${API_URL}/api/tasks/${task.ID_Task}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ID_Status: completedStatus.ID_Status }),
          });
          if (!res.ok) throw new Error();
        } catch (err) {
          console.error(`Ошибка при авто-завершении задачи ID ${task.ID_Task}:`, err);
        }
      }
  
      fetchAll();
    };
  
    autoUpdateOverdueTasks();
  }, [tasks, statusesData, fetchAll]);
  
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesTeam = !filterTeam || teams.find((t) => t.Team_Name === task.Team_Name)?.ID_Team === filterTeam;
      const matchesProject = !filterProject || task.ID_Order === filterProject;
      const matchesEmployee = !filterEmployee || task.Employees.some((emp) => emp.fullName === filterEmployee);
  
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        task.Task_Name.toLowerCase().includes(query) ||
        task.Description.toLowerCase().includes(query) ||
        task.Order_Name.toLowerCase().includes(query) ||
        task.Employees.some((emp) => emp.fullName.toLowerCase().includes(query));
  
      return matchesTeam && matchesProject && matchesEmployee && matchesSearch;
    });
  }, [tasks, filterTeam, filterProject, filterEmployee, teams, searchQuery]);
  
  
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
  
    const taskId = parseInt(draggableId.split('-')[1], 10);
    const task = tasks.find(t => t.ID_Task === taskId);
    if (!task) return;
  
    const fromStatus = source.droppableId;
    const toStatus = destination.droppableId;
    const isGoingToFinalStatus = toStatus === 'Выполнена' || toStatus === 'Завершена';
    const isFromInitialStatus = fromStatus === 'Новая' || fromStatus === 'В работе';
    const isDeadlineValid = !task.Deadline || dayjs(task.Deadline).isAfter(dayjs());
  
    const statusObj = statusesData.find(s => s.Status_Name === toStatus);
    if (!statusObj) return;
  
    if (isFromInitialStatus && isGoingToFinalStatus && isDeadlineValid) {
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
    setTasks(prev =>
      prev.map(t => (t.ID_Task === taskId ? { ...t, Status_Name: statusesData.find(s => s.ID_Status === statusId)?.Status_Name || t.Status_Name } : t))
    );
    try {
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ID_Status: statusId }),
      });
      fetchAll();
    } catch {
      messageApi.error('Ошибка при изменении статуса');
    }
  };
  
  const handleDelete = async (taskId: number) => {
    try {
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      messageApi.success('Задача удалена');
      fetchAll();
    } catch {
      messageApi.error('Ошибка при удалении задачи');
    }
  };

  const showModal = (task?: Task) => {
    setEditingTask(task || null);
    setIsModalVisible(true);
  
    if (task) {
      const team = teams.find((t) => t.Team_Name === task.Team_Name) 
      || { ID_Team: -1, Team_Name: task.Team_Name || 'Удалённая команда', members: [], IsArchived: true };
    
      setSelectedTeamId(team?.ID_Team || null);
      setFilteredProjects(
        projects.filter(
          (proj) =>
            proj.ID_Team === team?.ID_Team &&
            !proj.IsArchived &&
            (!proj.Deadline || dayjs(proj.Deadline).isAfter(dayjs()))
        )
      );
      
      setSelectedMembers(task.Employees.map(e => e.fullName));
  
      form.setFieldsValue({
        Task_Name: task.Task_Name,
        Description: task.Description,
        ID_Status: statusesData.find((s) => s.Status_Name === task.Status_Name)?.ID_Status,
        ID_Order: task.ID_Order,
        Time_Norm: task.Time_Norm,
        Deadline: task.Deadline ? dayjs(task.Deadline) : null
      });
      
      if (task.attachments?.length) {
        setSelectedFiles(
          task.attachments.map((filename, idx) => ({
            uid: `existing-${idx}`,
            name: filename,
            status: 'done',
            url: `${API_URL}/uploads/${filename}`,
            originFileObj: undefined // 👈 ДОБАВЬ ЭТО
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
    if (values.Deadline && dayjs(values.Deadline).isBefore(dayjs(), 'day')) {
      messageApi.error('Дедлайн не может быть назначен прошедшей датой!');
      return;
    }
  
    const uploadedFilenames: string[] = [];
  
    for (const file of selectedFiles) {
      if (file.originFileObj) {
        const formData = new FormData();
        formData.append('file', file.originFileObj);
  
        try {
          const res = await fetch(`${API_URL}/api/upload-task`, {
            method: 'POST',
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
  
    const newStatus = statusesData.find(s => s.Status_Name === 'Новая');
    if (!newStatus) {
      messageApi.error('Не найден статус "Новая"');
      return;
    }
  
    const payload = {
      ...values,
      ID_Status: newStatus.ID_Status, // Устанавливаем статус "Новая"
      Employee_Names: selectedMembers,
      Deadline: values.Deadline ? dayjs(values.Deadline).toISOString() : null,
      attachments: uploadedFilenames,
    };
  
    try {
      const url = editingTask
        ? `${API_URL}/api/tasks/${editingTask.ID_Task}`
        : `${API_URL}/api/tasks`;
      const method = editingTask ? 'PUT' : 'POST';
  
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) throw new Error();
      messageApi.success(editingTask ? 'Задача обновлена' : 'Задача создана');
      setIsModalVisible(false);
      fetchAll();
    } catch {
      messageApi.error('Ошибка при сохранении задачи');
    }
  };
  
  const handleTeamChange = (teamId: number) => {
    setSelectedTeamId(teamId);
    setSelectedMembers([]);
    const activeProjects = projects.filter(
      (proj) => proj.ID_Team === teamId && !proj.IsArchived && (!proj.Deadline || dayjs(proj.Deadline).isAfter(dayjs()))
    );
    setFilteredProjects(activeProjects);
    form.setFieldsValue({ ID_Order: undefined });
  };
  

  const openViewModal = (task: Task) => {
    setViewingTask(task);
    setIsViewModalVisible(true);
  };
  const handleEditComment = async (commentId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentText: editedCommentText }),
      });
  
      if (!res.ok) throw new Error();
      setEditingCommentId(null);
      openCommentsModal(currentTaskId!);
      messageApi.success('Комментарий обновлён');
    } catch {
      messageApi.error('Ошибка при обновлении комментария');
    }
  };
  
  const handleDeleteComment = async (commentId: number) => {
    try {
      await fetch(`${API_URL}/api/comments/${commentId}`, { method: 'DELETE' });
      messageApi.success('Комментарий удалён');
      openCommentsModal(currentTaskId!);
    } catch {
      messageApi.error('Ошибка при удалении комментария');
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
              <h2 className="dashboard-title">Задачи</h2>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8 }}>
                          <Button className="add-task-button" onClick={() => showModal()}>
                            ➕ Добавить задачу
                          </Button>
  
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
                            <Input
                              placeholder="Поиск по задачам..."
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
                              <Button className="filters-button" icon={<FilterOutlined />}>
                                Фильтры
                              </Button>
                            </Dropdown>
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
                        </div>
  

<DragDropContext onDragEnd={handleDragEnd}>
  <div className="kanban-wrapper">
    <div className="kanban-columns">
      {statuses.map((status) => (
        <Droppable key={status} droppableId={status}>
          {(provided) => (
            <div
              className="kanban-status-block"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              <div className="kanban-status-header">{status}</div>
              {(filteredGroupedMap[status] || []).map((task, index) => (
                <Draggable
                  key={`task-${task.ID_Task}`}
                  draggableId={`task-${task.ID_Task}`}
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
                        <p><i>Проект:</i> {task.Order_Name}</p>

                        <div className="kanban-avatars">
                          {task.Employees.map((emp, idx) => (
                            <Tooltip key={`emp-${task.ID_Task}-${idx}`} title={emp.fullName}>
                              <Avatar
                                src={emp.avatar ? `${API_URL}/uploads/${emp.avatar}` : undefined}
                                style={{
                                  backgroundColor: emp.avatar ? 'transparent' : '#777',
                                  marginRight: 4,
                                  marginBottom: 4,
                                }}
                              >
                                {!emp.avatar && getInitials(emp.fullName)}
                              </Avatar>
                            </Tooltip>
                          ))}
                        </div>

                        <div className="task-footer">
                          <Button
                            type="text"
                            icon={<EyeOutlined className="kanban-icon" />}
                            onClick={() => openViewModal(task)}
                            style={{ padding: 0, height: 'auto', marginRight: 8 }}
                          />
                          <Button
                            type="text"
                            icon={<MessageOutlined className="kanban-icon" />}
                            onClick={() => openCommentsModal(task.ID_Task)}
                            style={{ padding: 0, height: 'auto' }}
                          />
                    {task.Status_Name === 'Завершена' && task.AutoCompleted ? (
  <div className="deadline-box expired">
    <ClockCircleOutlined style={{ marginRight: 6 }} />
    Срок истёк
  </div>
) : task.Status_Name === 'Завершена' ? (
  <div className="deadline-box completed">
    <ClockCircleOutlined style={{ marginRight: 6 }} />
    Завершена
  </div>
) : task.Status_Name === 'Выполнена' ? (
  <div className="deadline-box completed">
    <ClockCircleOutlined style={{ marginRight: 6 }} />
    Выполнено
  </div>
) : task.Deadline ? (
  <div
    className={`deadline-box ${
      dayjs(task.Deadline).isBefore(dayjs())
        ? 'expired'
        : dayjs(task.Deadline).diff(dayjs(), 'hour') <= 24
        ? 'warning'
        : 'safe'
    }`}
  >
    <ClockCircleOutlined style={{ marginRight: 6 }} />
    {dayjs(task.Deadline).diff(dayjs(), 'day') > 0
      ? `Осталось ${dayjs(task.Deadline).diff(dayjs(), 'day')} дн`
      : dayjs(task.Deadline).diff(dayjs(), 'hour') > 0
      ? `Осталось ${dayjs(task.Deadline).diff(dayjs(), 'hour')} ч`
      : 'Срок истёк'}
  </div>
) : (
  <div className="deadline-box undefined">
    <ClockCircleOutlined style={{ marginRight: 6 }} />
    Без срока
  </div>
)}



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
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 16,
                          flexWrap: 'wrap',
                          gap: 8
                        }}>
                          {/* Левая сторона — кнопка добавления */}
                          <Button className="add-task-button" onClick={() => showModal()}>
                            ➕ Добавить задачу
                          </Button>
                  
                          {/* Правая сторона — строка поиска, фильтры и экспорт */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Input
                              placeholder="Поиск по задачам, проектам, описаниям и исполнителям..."
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
                              <Button className="filters-button" icon={<FilterOutlined />}>
                                Фильтры
                              </Button>
                            </Dropdown>
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
                        </div>
                  
                        <Table dataSource={tasks} columns={tableColumns} rowKey="ID_Task" />
                      </>
                    ),
                  }
                  
                  
                ]}
              />
              {/* Модальное окно редактирования или создания задачи */}
              <Modal
                title={editingTask ? 'Редактировать задачу' : 'Создать задачу'}
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
      .filter(team => {
        const isArchived = team.IsArchived ?? false;
        const isSelected = team.ID_Team === selectedTeamId;
        return !isArchived || isSelected;
      })
      .map(team => (
        <Option key={`team-${team.ID_Team}`} value={team.ID_Team}>
          {team.Team_Name}{team.IsArchived ? ' (архив)' : ''}
        </Option>
      ))}
  </Select>
</Form.Item>


                  <Form.Item name="ID_Order" label="Проект" rules={[{ required: true }]}>
  <Select placeholder="Выберите проект">
    {filteredProjects
      .filter(proj => !proj.IsArchived && (!proj.Deadline || dayjs(proj.Deadline).isAfter(dayjs())))
      .map(proj => (
        <Option key={`order-${proj.ID_Order}`} value={proj.ID_Order}>
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
                      {teams.find((t) => t.ID_Team === selectedTeamId)?.members.map((member) => (
                        <Option key={`member-${member.id}`} value={member.fullName}>
                          {member.fullName}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="Task_Name" label="Название задачи" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="Description" label="Описание" rules={[{ required: true }]}>
                    <Input.TextArea />
                  </Form.Item>
                  <Form.Item name="Deadline" label="Дедлайн" rules={[{
                      validator: (_, value) => {
                        if (value && dayjs(value).isBefore(dayjs(), 'day')) {
                          return Promise.reject('Дедлайн не может быть назначен прошедшей датой!');
                        }
                        return Promise.resolve();
                      }
                    }]}>
                    <DatePicker
                        style={{ width: '100%' }}
                        showTime
                        placeholder="Без дедлайна"
                      />
                    </Form.Item>
                    
                  <Form.Item name="Time_Norm" label="Норма времени (часы)" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={0} step={0.5} />
                  </Form.Item>
                  <Form.Item label="Прикрепить файлы">
  <Upload
    multiple
    beforeUpload={() => false}
    fileList={selectedFiles}
    onChange={({ fileList }) => {
      setSelectedFiles(fileList.map(file => ({
        ...file,
        originFileObj: file.originFileObj ?? undefined
      })));
    }}
    onRemove={(file) => {
      setSelectedFiles(prev => prev.filter(f => f.uid !== file.uid));
      return false;
    }}
  >
   <Button icon={<UploadOutlined />} className="upload-btn-dark">Выберите файлы</Button>

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
                  <Button key="edit" onClick={() => {
                    if (viewingTask) showModal(viewingTask);
                    setIsViewModalVisible(false);
                  }}>
                     Редактировать
                  </Button>,
                  <Button key="close" onClick={() => setIsViewModalVisible(false)}>
                    Закрыть
                  </Button>
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
        <Tooltip key={`emp-view-${emp.id}-${idx}`} title={emp.fullName}>
          <Avatar
            src={emp.avatar ? `${API_URL}/uploads/${emp.avatar}` : undefined}
            icon={!emp.avatar ? <UserOutlined /> : undefined}
            style={{
              backgroundColor: emp.avatar ? 'transparent' : '#777',
              marginRight: 4
            }}
          >
            {!emp.avatar && getInitials(emp.fullName)}
          </Avatar>
        </Tooltip>
      ))}
    </div>

    {viewingTask.attachments && viewingTask.attachments.length > 0 && (
      <>
        <p><strong>Файлы:</strong></p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {viewingTask.attachments.map((filename, idx) => (
            <a
              key={`att-view-${idx}`}
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

    {/* ✅ ВСТАВЬ ЭТО */}
    <p><strong>Загрузить новый файл:</strong></p>
    <input type="file" onChange={handleFileUpload} />
    {selectedFileName && (
  <div style={{ marginTop: '8px', fontSize: '13px', color: '#aaa' }}>
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
  <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
    {comments.length ? comments.map((c) => (
      <div key={c.ID_Comment} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <Avatar src={c.Avatar ? `${API_URL}/uploads/${c.Avatar}` : undefined} style={{ marginRight: 8 }} />
          <strong>{c.AuthorName}</strong>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#aaa' }}>
            {dayjs(c.Created_At).format('YYYY-MM-DD HH:mm')}
          </span>
        </div>

        {editingCommentId === c.ID_Comment ? (
          <>
            <Input.TextArea
              value={editedCommentText}
              onChange={(e) => setEditedCommentText(e.target.value)}
              autoSize
            />
            <div style={{ marginTop: 4, textAlign: 'right' }}>
              <Button onClick={() => setEditingCommentId(null)} style={{ marginRight: 8 }}>Отмена</Button>
              <Button type="primary" onClick={() => handleEditComment(c.ID_Comment)}>Сохранить</Button>
            </div>
          </>
        ) : (
          <div style={{ paddingLeft: 32 }}>{c.CommentText}</div>
        )}

        {c.ID_User === userId && editingCommentId !== c.ID_Comment && (
          <div className="comment-action-buttons">
          <Button size="small" onClick={() => {
            setEditingCommentId(c.ID_Comment);
            setEditedCommentText(c.CommentText);
          }}>Редактировать</Button>
          <Button size="small" onClick={() => handleDeleteComment(c.ID_Comment)}>Удалить</Button>
        </div>
        
        )}
      </div>
    )) : (
      <p style={{ color: '#aaa' }}>Комментариев пока нет.</p>
    )}
  </div>

  <Input.TextArea
    placeholder="Введите комментарий..."
    rows={3}
    value={newComment}
    onChange={(e) => setNewComment(e.target.value)}
  />
  <Button type="primary" onClick={submitComment} style={{ marginTop: 8 }} block>
    Отправить
  </Button>
</Modal>

<Modal
  title="Подтвердите действие"
  open={isConfirmModalVisible}
  onOk={async () => {
    if (pendingDragTask) {
      await updateTaskStatus(pendingDragTask.taskId, pendingDragTask.targetStatusId);
      setPendingDragTask(null);
    }
    setIsConfirmModalVisible(false);
  }}
  onCancel={() => {
    setPendingDragTask(null);
    setIsConfirmModalVisible(false);
  }}
>
  <p>Вы уверены, что хотите переместить задачу в статус «{pendingDragTask?.targetStatusName}»?</p>
</Modal>

            </main>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default ManagerDashboard;
