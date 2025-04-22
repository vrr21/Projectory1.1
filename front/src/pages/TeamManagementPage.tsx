import React, { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  message,
  ConfigProvider,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Header from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import '../styles/pages/TeamManagementPage.css';

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface TeamMember {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface Team {
  ID_Team: number;
  Team_Name: string;
  members: TeamMember[];
}

const roleOptions = [
  'Менеджер', 'Сотрудник', 'Scrum Master', 'Product Owner', 'Разработчик',
  'Тестировщик', 'Дизайнер UX/UI', 'Аналитик', 'DevOps-инженер', 'Технический писатель',
  'Менеджер (Администратор)', 'Тимлид', 'Бизнес-аналитик', 'Архитектор ПО',
  'Frontend-разработчик', 'Backend-разработчик', 'Fullstack-разработчик',
  'Системный администратор', 'Специалист по безопасности', 'Маркетолог',
  'HR-менеджер', 'Координатор проектов'
].map(role => ({ label: role, value: role }));

const TeamManagementPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isTeamModalVisible, setIsTeamModalVisible] = useState(false);
  const [isAddMembersModalVisible, setIsAddMembersModalVisible] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [teamForm] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams`);
      if (!res.ok) throw new Error();
      const data: Team[] = await res.json();
      setTeams(data);
    } catch {
      messageApi.error('Ошибка при загрузке команд');
    }
  }, [messageApi]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleCreateTeam = async (values: { name: string }) => {
    const teamName = values?.name?.trim();

    if (!teamName) {
      messageApi.error('Название команды не может быть пустым');
      return;
    }

    const duplicate = teams.some(
      team => team.Team_Name.trim().toLowerCase() === teamName.toLowerCase()
    );
    if (duplicate) {
      messageApi.error('Команда с таким названием уже существует');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Team_Name: teamName }), // ✅ ключ исправлен
      });

      if (!res.ok) throw new Error();
      await fetchTeams();
      teamForm.resetFields();
      setIsTeamModalVisible(false);
      messageApi.success('Команда успешно создана');
    } catch {
      messageApi.error('Ошибка при создании команды');
    }
  };

  const handleAddMember = async (values: Omit<TeamMember, 'id'>) => {
    if (!currentTeamId) return;
    try {
      const res = await fetch(`${API_URL}/api/teams/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, teamId: currentTeamId }),
      });

      if (res.status === 400) {
        const { message: errMsg } = await res.json();
        messageApi.error(errMsg || 'Ошибка валидации данных участника');
        return;
      }

      if (!res.ok) throw new Error();
      memberForm.resetFields();
      fetchTeams();
      messageApi.success('Участник добавлен');
    } catch {
      messageApi.error('Ошибка при добавлении участника');
    }
  };

  const handleDeleteMember = async (teamId: number, memberId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/team/${teamId}/remove/${memberId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      messageApi.success('Участник удалён');
      fetchTeams();
    } catch {
      messageApi.error('Ошибка при удалении участника');
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/teams/${teamId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      messageApi.success('Команда удалена');
      fetchTeams();
    } catch {
      messageApi.error('Ошибка при удалении команды');
    }
  };

  const columns: ColumnsType<Team> = [
    {
      title: 'Название команды',
      dataIndex: 'Team_Name',
      key: 'Team_Name',
    },
    {
      title: 'Участники',
      key: 'members',
      render: (_, team) => (
        <div>
          {team.members.map((m) => (
  <div key={`${team.ID_Team}-${m.email}-${m.role}`}>
    {m.fullName} ({m.role}) — {m.email}{' '}
    <Button
      type="link"
      danger
      size="small"
      onClick={() => handleDeleteMember(team.ID_Team, m.id)}
    >
      Удалить
    </Button>
  </div>
))}

        </div>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, team) => (
        <>
          <Button
            type="link"
            onClick={() => {
              setCurrentTeamId(team.ID_Team);
              setIsAddMembersModalVisible(true);
            }}
          >
            Добавить участников
          </Button>
          <Button type="link" danger onClick={() => handleDeleteTeam(team.ID_Team)}>
            Удалить команду
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
            <h1>Управление командами</h1>
            <Button type="primary" onClick={() => setIsTeamModalVisible(true)}>
              Создать команду
            </Button>
            <Table
              dataSource={teams}
              columns={columns}
              rowKey="ID_Team"
              style={{ marginTop: 20 }}
            />

            <Modal
              title="Создание команды"
              open={isTeamModalVisible}
              onCancel={() => setIsTeamModalVisible(false)}
              onOk={() => teamForm.submit()}
              okText="Создать"
              cancelText="Отмена"
            >
              <Form form={teamForm} layout="vertical" onFinish={handleCreateTeam}>
                <Form.Item
                  name="name"
                  label="Название команды"
                  rules={[{ required: true, message: 'Введите название команды' }]}
                >
                  <Input />
                </Form.Item>
              </Form>
            </Modal>

            <Modal
              title="Добавление участника"
              open={isAddMembersModalVisible}
              onCancel={() => {
                setIsAddMembersModalVisible(false);
                memberForm.resetFields();
              }}
              footer={null}
            >
              <Form form={memberForm} layout="vertical" onFinish={handleAddMember}>
                <Form.Item
                  name="fullName"
                  label="Полное имя"
                  rules={[{ required: true, message: 'Введите имя' }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[{ required: true, message: 'Введите email' }, { type: 'email' }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="role"
                  label="Должность"
                  rules={[{ required: true, message: 'Выберите должность' }]}
                >
                  <Select options={roleOptions} showSearch optionFilterProp="label" />
                </Form.Item>
                <Form.Item>
                  <Button type="dashed" htmlType="submit" block>
                    Добавить участника
                  </Button>
                </Form.Item>
              </Form>
            </Modal>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default TeamManagementPage;
