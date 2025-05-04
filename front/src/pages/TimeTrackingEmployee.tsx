import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Tabs, Button, Form, Input, Select, DatePicker, Upload, notification, Modal, List, App } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import moment from 'moment';
import { UploadFile } from 'antd/es/upload/interface';
import HeaderEmployee from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
import "../styles/pages/TimeTrackingEmployee.css";

const { Content } = Layout;

interface Project {
  ID_Project: string;
  Order_Name: string;
  ID_Team: string;
}

interface Task {
  ID_Task: string;
  Task_Name: string;
  Description: string;
  Time_Norm: number;
  Deadline: string | null;
}

interface TimeTrackingFormValues {
  project: string;
  taskName: string;
  description: string;
  hours: number;
  date: moment.Moment | null;
  file: UploadFile[];
}

const TimeTrackingEmployee: React.FC = () => {
  const [activeKey, setActiveKey] = useState('1');
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeTrackingFormValues[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [api, contextHolder] = notification.useNotification();

  const fetchProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token available');
      }

      const userResponse = await fetch('http://localhost:3002/api/auth/current-user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      console.log('User Data:', userData); // Debugging line to check the user data

      const response = await fetch('http://localhost:3002/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      console.log('Fetched Projects:', data);  // Debugging line to check the projects data

      const filteredProjects = data.filter((project: Project) => project.ID_Team === userData.teamID); // Filter by user's team
      setProjects(filteredProjects); // Set filtered projects
    } catch (error: unknown) {
      console.error('Error fetching projects:', error);
      if (error instanceof Error) {
        api.error({
          message: 'Error',
          description: error.message || 'Failed to fetch projects from the server.',
        });
      }
    }
  }, [api]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchTasks = async (projectId: string) => {
    try {
      const response = await fetch(`http://localhost:3002/api/tasks?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      console.log('Fetched Tasks:', data); // Debugging line to check the tasks data
      setTasks(data);
    } catch (error: unknown) {
      console.error('Error fetching tasks:', error);
      if (error instanceof Error) {
        api.error({
          message: 'Error',
          description: error.message || 'Failed to fetch tasks from the server.',
        });
      }
    }
  };

  const handleTabChange = (key: string) => {
    setActiveKey(key);
  };

  const handleFormSubmit = async (values: TimeTrackingFormValues) => {
    api.success({
      message: 'Time Entry Added',
      description: `You have successfully logged time for task ${values.taskName}.`,
    });

    try {
      await fetch('http://localhost:3002/api/time-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      
      setTimeEntries([...timeEntries, values]);
      form.resetFields();
      setIsModalVisible(false); // Close modal after submission
    } catch (error: unknown) {
      console.error('Error saving time entry:', error);
      if (error instanceof Error) {
        api.error({
          message: 'Error',
          description: error.message || 'Failed to save time entry.',
        });
      }
    }
  };

  const normFile = (e: { fileList: UploadFile[] }) => {
    return Array.isArray(e) ? e : e.fileList;
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <App>
      {contextHolder}

      <Layout className="layout">
        <Sidebar role="employee" />
        <Layout className="main-layout">
          <HeaderEmployee />
          <Content className="content">
            <div className="page-content">
              <Tabs activeKey={activeKey} onChange={handleTabChange} items={[{
                label: 'Люди',
                key: '1',
                children: (
                  <>
                    <Button 
                      type="primary" 
                      onClick={showModal} 
                      className="submit-button-right"
                    >
                      Добавить потраченное время
                    </Button>

                    <Modal
                      title="Добавить потраченное время"
                      open={isModalVisible}
                      onCancel={handleCancel}
                      footer={null}
                      width={600}
                    >
                      <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFormSubmit}
                        className="time-tracking-form"
                      >
                        <Form.Item label="Проект" name="project" rules={[{ required: true, message: 'Выберите проект!' }]}>
                          <Select placeholder="Выберите проект" allowClear onChange={fetchTasks}>
                            {projects.map((project) => (
                              <Select.Option 
                                key={project.ID_Project || Math.random()}  
                                value={project.ID_Project || ''}  
                              >
                                {project.Order_Name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>

                        <Form.Item label="Задача" name="taskName" rules={[{ required: true, message: 'Выберите задачу!' }]}>
                          <Select placeholder="Выберите задачу" allowClear>
                            {tasks.map((task) => (
                              <Select.Option key={task.ID_Task} value={task.ID_Task}>
                                {task.Task_Name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>

                        <Form.Item label="Описание" name="description">
                          <Input.TextArea placeholder="Опишите, что вы сделали" />
                        </Form.Item>

                        <Form.Item label="Потраченные часы" name="hours" rules={[{ required: true, message: 'Укажите количество часов!' }]}>
                          <Input type="number" placeholder="Часы" />
                        </Form.Item>

                        <Form.Item label="Дата" name="date" rules={[{ required: true, message: 'Выберите дату!' }]}>
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item label="Прикрепить файл" name="file" valuePropName="fileList" getValueFromEvent={normFile}>
                          <Upload.Dragger name="files" multiple={true} showUploadList={false}>
                            <p className="ant-upload-drag-icon">
                              <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Перетащите сюда файл или нажмите для выбора</p>
                          </Upload.Dragger>
                        </Form.Item>

                        <Form.Item>
                          <Button type="primary" htmlType="submit" className="submit-button">
                            Добавить
                          </Button>
                        </Form.Item>
                      </Form>
                    </Modal>

                    <List
                      header={<div>Добавленные карточки времени:</div>}
                      bordered
                      dataSource={timeEntries}
                      renderItem={(entry) => (
                        <List.Item>
                          <div>{entry.project} - {entry.taskName}</div>
                          <div>Дата: {entry.date?.format('DD/MM/YYYY')}</div>
                          <div>Часы: {entry.hours}</div>
                          <div>Описание: {entry.description}</div>
                        </List.Item>
                      )}
                    />
                  </>
                ),
              }]} />
            </div>
          </Content>
        </Layout>
      </Layout>
    </App>
  );
};

export default TimeTrackingEmployee;
