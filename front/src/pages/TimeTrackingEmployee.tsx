import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Button, Form, Input, Select, DatePicker, Upload,
  notification, Modal, App, Tooltip
} from 'antd';
import {
  InboxOutlined, EyeOutlined, EditOutlined, DeleteOutlined,
  LeftOutlined, RightOutlined, CalendarOutlined
} from '@ant-design/icons';
import moment, { Moment } from 'moment';
import 'moment/locale/ru';
import { UploadFile } from 'antd/es/upload/interface';
import HeaderEmployee from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
import '../styles/pages/TimeTrackingEmployee.css';

moment.locale('ru');

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
  date: Moment;
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
  const [weekStart, setWeekStart] = useState(moment().startOf('isoWeek'));
  const [api, contextHolder] = notification.useNotification();

  const weekDaysRu = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  const fetchProjects = useCallback(async () => {
    const token = localStorage.getItem('token');
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
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/time-tracking`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTimeEntries(await res.json());
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchTasks();
    fetchTimeEntries();
  }, [fetchProjects, fetchTasks, fetchTimeEntries]);

  const handleEdit = (entry: RawTimeEntry) => {
    setEditingEntry(entry);
    form.setFieldsValue({
      project: projects.find(p => p.Order_Name === entry.Order_Name)?.ID_Order,
      taskName: entry.ID_Task,
      hours: entry.Hours_Spent,
      date: moment(entry.Start_Date),
      description: entry.Description || '',
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/time-tracking/${id}`, { method: 'DELETE' });
      api.success({ message: 'Запись удалена' });
      fetchTimeEntries();
    } catch {
      api.error({ message: 'Ошибка удаления' });
    }
  };

  const handleFormSubmit = async (values: TimeTrackingFormValues) => {
    const token = localStorage.getItem('token');
    const payload = {
      project: values.project,
      taskName: values.taskName,
      date: values.date.toISOString(),
      description: values.description,
      hours: values.hours,
    };

    const method = editingEntry ? 'PUT' : 'POST';
    const url = `${API_URL}/api/time-tracking${editingEntry ? `/${editingEntry.ID_Execution}` : ''}`;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      api.success({ message: editingEntry ? 'Запись обновлена' : 'Время добавлено' });
      fetchTimeEntries();
      form.resetFields();
      setEditingEntry(null);
      setIsModalVisible(false);
    } else {
      api.error({ message: 'Ошибка при сохранении' });
    }
  };

  const getWeekDays = () => Array.from({ length: 7 }, (_, i) => weekStart.clone().add(i, 'day'));
  const getEntriesByDay = (day: Moment) =>
    timeEntries.filter(entry => moment(entry.Start_Date).isSame(day, 'day'));

  const normFile = (e: { fileList: UploadFile[] }) => Array.isArray(e) ? e : e.fileList;

  return (
    <App>
      {contextHolder}
      <Layout className="layout">
        <Sidebar role="employee" />
        <Layout className="main-layout">
          <HeaderEmployee />
          <Content className="content">
            <div className="page-content">
              <div className="time-tracking-header" style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                <Button icon={<LeftOutlined />} onClick={() => setWeekStart(weekStart.clone().subtract(1, 'week'))} />
                <h2 style={{ margin: '0 1rem' }}>
                  {weekStart.format('D MMMM')} – {weekStart.clone().add(6, 'days').format('D MMMM YYYY')}
                </h2>
                <Button icon={<RightOutlined />} onClick={() => setWeekStart(weekStart.clone().add(1, 'week'))} />
                <DatePicker
  key={weekStart.format('YYYY-MM-DD')}
  value={weekStart.clone()}
  format="DD.MM.YYYY"
  allowClear={false}
  suffixIcon={<CalendarOutlined />}
  style={{ marginLeft: 12 }}
  picker="date"
  inputReadOnly // предотвращает ручной ввод и ошибки в датах
  disabledDate={(current) =>
    current && (current.year() < 2000 || current.year() > 2100)
  }
  onChange={(date) => {
    if (date) {
      setWeekStart(date.clone().startOf('isoWeek'));
    }
  }}
  onOpenChange={(open) => {
    if (!open) {
      setWeekStart(prev => prev.clone().startOf('isoWeek'));
    }
  }}
/>


                <Button
                  type="primary"
                  onClick={() => {
                    form.resetFields();
                    setEditingEntry(null);
                    setIsModalVisible(true);
                  }}
                  style={{ marginLeft: 'auto' }}
                >
                  Добавить потраченное время
                </Button>
              </div>

              <div className="horizontal-columns">
                {getWeekDays().map(day => (
                  <div key={day.format()} className="horizontal-column">
                    <div className="day-header">{weekDaysRu[day.isoWeekday() - 1]}</div>
                    <div className="day-date">{day.format('DD.MM')}</div>
                    <div className="card-stack">
                      {getEntriesByDay(day).map(entry => (
                        <div key={entry.ID_Execution} className="entry-card">
                          <b>{entry.Task_Name}</b>
                          <div>Проект: {entry.Order_Name}</div>
                          <div>{entry.Hours_Spent} ч</div>
                          <div style={{ marginTop: 8 }}>
                            <Tooltip title="Просмотр">
                              <Button icon={<EyeOutlined />} onClick={() => { setViewingEntry(entry); setIsViewModalVisible(true); }} />
                            </Tooltip>
                            <Tooltip title="Редактировать">
                              <Button icon={<EditOutlined />} onClick={() => handleEdit(entry)} />
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(entry.ID_Execution)} />
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Modal title={editingEntry ? 'Редактировать' : 'Добавить'}
                     open={isModalVisible}
                     onCancel={() => setIsModalVisible(false)} footer={null}>
                <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
                  <Form.Item name="project" label="Проект" rules={[{ required: true }]}>
                    <Select placeholder="Выберите проект">
                      {projects.map(p => (
                        <Select.Option key={p.ID_Order} value={p.ID_Order}>
                          {p.Order_Name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="taskName" label="Задача" rules={[{ required: true }]}>
                    <Select placeholder="Выберите задачу">
                      {tasks.map(t => (
                        <Select.Option key={t.ID_Task} value={t.ID_Task}>
                          {t.Task_Name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="description" label="Описание">
                    <Input.TextArea />
                  </Form.Item>
                  <Form.Item name="hours" label="Потрачено часов" rules={[{ required: true }]}>
                    <Input type="number" />
                  </Form.Item>
                  <Form.Item name="date" label="Дата" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label="Прикрепить файл" name="file" valuePropName="fileList" getValueFromEvent={normFile}>
                    <Upload.Dragger name="files" multiple showUploadList={false}>
                      <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                      <p className="ant-upload-text">Перетащите сюда файл или нажмите для выбора</p>
                    </Upload.Dragger>
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      {editingEntry ? 'Обновить' : 'Добавить'}
                    </Button>
                  </Form.Item>
                </Form>
              </Modal>

              <Modal title="Просмотр записи" open={isViewModalVisible} onCancel={() => setIsViewModalVisible(false)}
                     footer={<Button onClick={() => setIsViewModalVisible(false)}>Закрыть</Button>}>
                {viewingEntry && (
                  <div style={{ lineHeight: 1.8 }}>
                    <p><b>Задача:</b> {viewingEntry.Task_Name}</p>
                    <p><b>Проект:</b> {viewingEntry.Order_Name}</p>
                    <p><b>Дата начала:</b> {moment(viewingEntry.Start_Date).format('DD.MM.YYYY HH:mm')}</p>
                    <p><b>Дата окончания:</b> {moment(viewingEntry.End_Date).format('DD.MM.YYYY HH:mm')}</p>
                    <p><b>Потрачено:</b> {viewingEntry.Hours_Spent} ч</p>
                    {viewingEntry.Description && <p><b>Описание:</b> {viewingEntry.Description}</p>}
                  </div>
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
