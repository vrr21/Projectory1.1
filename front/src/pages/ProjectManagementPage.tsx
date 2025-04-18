// src/pages/ProjectManagementPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ConfigProvider,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import moment, { Moment } from 'moment';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/pages/ProjectManagementPage.css';

const { Option } = Select;
const { darkAlgorithm } = theme;

interface Project {
  id: number;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  employeeId?: number;
}

interface ProjectFormValues {
  name: string;
  type: string;
  startDate: Moment;
  endDate: Moment;
  employeeId?: number;
}

interface Employee {
  id: number;
  fullName: string;
}

const ProjectManagementPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error();
      const data: Project[] = await response.json();
      setProjects(data);
    } catch {
      message.error('Ошибка при загрузке проектов');
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error();
      const data: Employee[] = await response.json();
      setEmployees(data);
    } catch {
      message.error('Ошибка при загрузке сотрудников');
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
  }, [fetchProjects, fetchEmployees]);

  const showModal = (project?: Project) => {
    setEditingProject(project || null);
    setIsModalVisible(true);
    if (project) {
      form.setFieldsValue({
        name: project.name,
        type: project.type,
        startDate: moment(project.startDate),
        endDate: moment(project.endDate),
        employeeId: project.employeeId,
      });
    } else {
      form.resetFields();
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingProject(null);
    form.resetFields();
  };

  const handleFinish = async (values: ProjectFormValues) => {
    const projectData = {
      ...values,
      startDate: values.startDate.format('YYYY-MM-DD'),
      endDate: values.endDate.format('YYYY-MM-DD'),
    };

    try {
      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
      const method = editingProject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) throw new Error();
      message.success(editingProject ? 'Проект обновлён' : 'Проект создан');
      fetchProjects();
      handleCancel();
    } catch {
      message.error('Ошибка при сохранении проекта');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      message.success('Проект удалён');
      fetchProjects();
    } catch {
      message.error('Ошибка при удалении проекта');
    }
  };

  const columns: ColumnsType<Project> = [
    { title: 'Название проекта', dataIndex: 'name', key: 'name' },
    { title: 'Тип проекта', dataIndex: 'type', key: 'type' },
    { title: 'Дата начала', dataIndex: 'startDate', key: 'startDate' },
    { title: 'Дата окончания', dataIndex: 'endDate', key: 'endDate' },
    {
      title: 'Сотрудник',
      dataIndex: 'employeeId',
      key: 'employeeId',
      render: (id) => employees.find((e) => e.id === id)?.fullName || 'Не назначен',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <>
          <Button type="link" onClick={() => showModal(record)}>Редактировать</Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>Удалить</Button>
        </>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <div className="dashboard">
        <Header />
        <div className="dashboard-body">
          <Sidebar role="manager" />
          <main className="main-content">
            <div className="project-management-page">
              <h1>Управление проектами</h1>
              <Button type="primary" onClick={() => showModal()} style={{ marginBottom: 16 }}>
                Добавить проект
              </Button>
              <Table dataSource={projects} columns={columns} rowKey="id" />

              <Modal
                title={editingProject ? 'Редактировать проект' : 'Создать проект'}
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={() => form.submit()}
              >
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                  <Form.Item
                    name="name"
                    label="Название проекта"
                    rules={[{ required: true, message: 'Пожалуйста, введите название проекта' }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="type"
                    label="Тип проекта"
                    rules={[{ required: true, message: 'Пожалуйста, выберите тип проекта' }]}
                  >
                    <Select placeholder="Выберите тип проекта">
                      <Option value="Разработка ПО">Разработка ПО</Option>
                      <Option value="Дизайн">Дизайн</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="employeeId"
                    label="Назначить сотрудника"
                    rules={[{ required: true, message: 'Пожалуйста, выберите сотрудника' }]}
                  >
                    <Select placeholder="Выберите сотрудника">
                      {employees.map(emp => (
                        <Option key={emp.id} value={emp.id}>{emp.fullName}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="startDate"
                    label="Дата начала"
                    rules={[{ required: true, message: 'Пожалуйста, выберите дату начала' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="endDate"
                    label="Дата окончания"
                    rules={[{ required: true, message: 'Пожалуйста, выберите дату окончания' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Form>
              </Modal>
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ProjectManagementPage;
