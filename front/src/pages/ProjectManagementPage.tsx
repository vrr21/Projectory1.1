import React, { useState, useEffect, useCallback } from 'react';
import {
  ConfigProvider,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  theme,
  AutoComplete,
} from 'antd';
import dayjs from 'dayjs';

import Header from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import '../styles/pages/ProjectManagementPage.css';

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface Project {
  ID_Order: number;
  Order_Name: string;
  Type_Name: string;
  Creation_Date: string;
  End_Date: string;
  Status: string;
  ID_Team?: number;
}

interface Team {
  ID_Team: number;
  Team_Name: string;
}

interface FormValues {
  Order_Name: string;
  Type_Name: string;
  Creation_Date: string;
  End_Date: string;
  Status: string;
  Team_Name: string;
}

const ProjectManagementPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders`);
      if (!response.ok) throw new Error('Ошибка при загрузке проектов');
      const data: Project[] = await response.json();
      setProjects(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      }
    }
  }, [messageApi]);

  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/teams`);
      if (!response.ok) throw new Error('Ошибка при загрузке команд');
      const data: Team[] = await response.json();
      setTeams(data.filter(team => typeof team.Team_Name === 'string'));
    } catch (error: unknown) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      }
    }
  }, [messageApi]);

  useEffect(() => {
    fetchProjects();
    fetchTeams();
  }, [fetchProjects, fetchTeams]);

  const showModal = (project?: Project) => {
    setEditingProject(project || null);
    setIsModalVisible(true);

    if (project) {
      const selectedTeam = teams.find(team => team.ID_Team === project.ID_Team);
      form.setFieldsValue({
        ...project,
        Team_Name: selectedTeam?.Team_Name || '',
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

  const getOrCreateTeam = async (teamName: string): Promise<number> => {
    const existingTeam = teams.find(
      team =>
        typeof team.Team_Name === 'string' &&
        team.Team_Name.toLowerCase() === teamName.toLowerCase()
    );

    if (existingTeam) return existingTeam.ID_Team;

    const response = await fetch(`${API_URL}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Team_Name: teamName }),
    });

    if (!response.ok) throw new Error('Ошибка при создании команды');

    const newTeam: Team = await response.json();
    await fetchTeams();
    return newTeam.ID_Team;
  };

  const handleFinish = async (values: FormValues) => {
    try {
      const teamId = await getOrCreateTeam(values.Team_Name);

      const payload: Omit<Project, 'ID_Order'> = {
        Order_Name: values.Order_Name,
        Type_Name: values.Type_Name,
        Creation_Date: values.Creation_Date,
        End_Date: values.End_Date,
        Status: values.Status,
        ID_Team: teamId,
      };

      const url = editingProject
        ? `${API_URL}/api/orders/${editingProject.ID_Order}`
        : `${API_URL}/api/orders`;
      const method = editingProject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Ошибка при сохранении проекта');
      messageApi.success(editingProject ? 'Проект обновлён' : 'Проект создан');
      fetchProjects();
      handleCancel();
    } catch (error: unknown) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Ошибка при удалении проекта');
      messageApi.success('Проект удалён');
      fetchProjects();
    } catch (error: unknown) {
      if (error instanceof Error) {
        messageApi.error(error.message);
      }
    }
  };

  const columns = [
    { title: 'Название проекта', dataIndex: 'Order_Name', key: 'Order_Name' },
    { title: 'Тип проекта', dataIndex: 'Type_Name', key: 'Type_Name' },
    {
      title: 'Дата создания',
      dataIndex: 'Creation_Date',
      key: 'Creation_Date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Дата окончания',
      dataIndex: 'End_Date',
      key: 'End_Date',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : ''),
    },
    { title: 'Статус', dataIndex: 'Status', key: 'Status' },
    {
      title: 'Команда',
      key: 'Team_Name',
      render: (_: unknown, record: Project) =>
        teams.find(t => t.ID_Team === record.ID_Team)?.Team_Name || '—',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: unknown, record: Project) => (
        <>
          <Button type="link" onClick={() => showModal(record)}>Редактировать</Button>
          <Button type="link" danger onClick={() => handleDelete(record.ID_Order)}>Удалить</Button>
        </>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      {contextHolder}
      <div className="dashboard">
        <Header />
        <div className="dashboard-body">
          <SidebarManager />
          <main className="main-content">
            <div className="project-management-page">
              <h1>Управление проектами</h1>
              <Button type="primary" onClick={() => showModal()} style={{ marginBottom: 16 }}>
                Добавить проект
              </Button>
              <Table dataSource={projects} columns={columns} rowKey="ID_Order" />
              <Modal
                title={editingProject ? 'Редактировать проект' : 'Создать проект'}
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={() => form.submit()}
              >
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                  <Form.Item name="Order_Name" label="Название проекта" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="Type_Name" label="Тип проекта" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="Creation_Date" label="Дата создания" rules={[{ required: true }]}>
                    <Input type="date" />
                  </Form.Item>
                  <Form.Item name="End_Date" label="Дата окончания">
                    <Input type="date" />
                  </Form.Item>
                  <Form.Item name="Status" label="Статус" rules={[{ required: true }]}>
                    <Select placeholder="Выберите статус проекта">
                      <Select.Option value="Новый">Новый</Select.Option>
                      <Select.Option value="В процессе">В процессе</Select.Option>
                      <Select.Option value="Завершён">Завершён</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="Team_Name"
                    label="Команда"
                    rules={[{ required: true, message: 'Введите или выберите команду' }]}
                  >
                    <AutoComplete
                      placeholder="Введите или выберите команду"
                      options={teams
                        .filter(team => typeof team.Team_Name === 'string')
                        .map(team => ({
                          value: team.Team_Name,
                        }))
                      }
                      filterOption={(inputValue, option) =>
                        (option?.value ?? '').toLowerCase().includes(inputValue.toLowerCase())
                      }
                    />
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
