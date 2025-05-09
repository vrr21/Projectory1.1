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
  Dropdown,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons';

import Header from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import '../styles/pages/ProjectManagementPage.css';

const { darkAlgorithm } = theme;
const { Option } = Select;
const API_URL = import.meta.env.VITE_API_URL;

interface Project {
  ID_Order: number;
  Order_Name: string;
  Type_Name: string;
  Creation_Date: string;
  End_Date: string;
  Status: string;
  ID_Team?: number;
  Team_Name?: string;
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

  const fetchTeams = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/teams`);
      if (!response.ok) throw new Error('Ошибка при загрузке команд');
      const data: Team[] = await response.json();
      setTeams(data);
    } catch (error: unknown) {
      if (error instanceof Error) messageApi.error(error.message);
    }
  }, [messageApi]);

  const fetchProjects = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/projects`);
      if (!response.ok) throw new Error('Ошибка при загрузке проектов');
      const data: Project[] = await response.json();

      const projectsWithTeamNames = data.map((proj) => {
        const team = teams.find((t) => t.ID_Team === proj.ID_Team);
        return {
          ...proj,
          Team_Name: team?.Team_Name || '—',
        };
      });

      setProjects(projectsWithTeamNames);
    } catch (error: unknown) {
      if (error instanceof Error) messageApi.error(error.message);
    }
  }, [messageApi, teams]);

  useEffect(() => {
    (async () => {
      await fetchTeams();
    })();
  }, [fetchTeams]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const showModal = (project?: Project): void => {
    setEditingProject(project || null);
    setIsModalVisible(true);

    if (project) {
      form.setFieldsValue({
        ...project,
        Team_Name: project.Team_Name || '',
      });
    } else {
      form.resetFields();
    }
  };

  const handleCancel = (): void => {
    setIsModalVisible(false);
    setEditingProject(null);
    form.resetFields();
  };

  const getOrCreateTeam = async (teamName: string): Promise<number> => {
    const existingTeam = teams.find(
      (team) => team.Team_Name.toLowerCase() === teamName.toLowerCase()
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

  const handleFinish = async (values: FormValues): Promise<void> => {
    try {
      const teamId = await getOrCreateTeam(values.Team_Name);

      const payload: Omit<Project, 'ID_Order' | 'Team_Name'> = {
        Order_Name: values.Order_Name,
        Type_Name: values.Type_Name,
        Creation_Date: values.Creation_Date,
        End_Date: values.End_Date,
        Status: values.Status,
        ID_Team: teamId,
      };

      const url = editingProject
        ? `${API_URL}/api/projects/${editingProject.ID_Order}`
        : `${API_URL}/api/projects`;
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
      if (error instanceof Error) messageApi.error(error.message);
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Ошибка при удалении проекта');
      messageApi.success('Проект удалён');
      fetchProjects();
    } catch (error: unknown) {
      if (error instanceof Error) messageApi.error(error.message);
    }
  };

  const handleExport = async (format: string): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/export/projects?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      // Новая проверка ошибок с логированием текста ошибки
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Ошибка экспорта:', errorText);
        throw new Error(errorText || 'Ошибка при экспорте');
      }
  
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      let extension = 'txt';
      if (format === 'excel') extension = 'xlsx';
      else if (format === 'word') extension = 'docx';
      else if (format === 'pdf') extension = 'pdf';
      
      link.setAttribute('download', `projects_export.${extension}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Ошибка экспорта:', error.message);
        messageApi.error(error.message);
      } else {
        messageApi.error('Произошла неизвестная ошибка.');
      }
    }
  };
  

  const columns: ColumnsType<Project> = [
    { title: 'Название проекта', dataIndex: 'Order_Name', key: 'Order_Name' },
    { title: 'Тип проекта', dataIndex: 'Type_Name', key: 'Type_Name' },
    {
      title: 'Дата создания',
      dataIndex: 'Creation_Date',
      key: 'Creation_Date',
      render: (date: string): string => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Дата окончания',
      dataIndex: 'End_Date',
      key: 'End_Date',
      render: (date: string): string =>
        date ? dayjs(date).format('YYYY-MM-DD') : '',
    },
    { title: 'Статус', dataIndex: 'Status', key: 'Status' },
    {
      title: 'Команда',
      dataIndex: 'Team_Name',
      key: 'Team_Name',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_text, record) => (
        <>
          <Button
            type="link"
            onClick={() => showModal(record)}
            icon={<EditOutlined />}
          >
            Редактировать
          </Button>
          <Button
            type="link"
            danger
            onClick={() => handleDelete(record.ID_Order)}
            icon={<DeleteOutlined />}
          >
            Удалить
          </Button>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Button type="primary" onClick={() => showModal()}>
                  Добавить проект
                </Button>
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
              <Table dataSource={projects} columns={columns} rowKey="ID_Order" />
              <Modal
                title={editingProject ? 'Редактировать проект' : 'Создать проект'}
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={() => form.submit()}
              >
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                  <Form.Item
                    name="Order_Name"
                    label="Название проекта"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="Type_Name"
                    label="Тип проекта"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="Creation_Date"
                    label="Дата создания"
                    rules={[{ required: true }]}
                  >
                    <Input type="date" />
                  </Form.Item>
                  <Form.Item
                    name="End_Date"
                    label="Дата окончания"
                    rules={[{ required: true }]}
                  >
                    <Input type="date" />
                  </Form.Item>
                  <Form.Item
                    name="Status"
                    label="Статус"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Выберите статус проекта">
                      <Option value="Новый">Новый</Option>
                      <Option value="В процессе">В процессе</Option>
                      <Option value="Завершён">Завершён</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="Team_Name"
                    label="Команда"
                    rules={[{ required: true }]}
                  >
                    <AutoComplete
                      placeholder="Введите или выберите команду"
                      options={teams.map((team) => ({
                        value: team.Team_Name,
                      }))}
                      filterOption={(inputValue, option) =>
                        (option?.value ?? '')
                          .toLowerCase()
                          .includes(inputValue.toLowerCase())
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
