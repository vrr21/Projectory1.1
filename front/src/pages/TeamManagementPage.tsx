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
  App as AntdApp,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, DeleteOutlined, DownloadOutlined, InboxOutlined } from '@ant-design/icons';

import Header from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import '../styles/pages/TeamManagementPage.css';
import { Dropdown } from 'antd';

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface TeamMember {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface User {
  id: number;
  fullName: string;
  email: string;
}

interface Team {
  ID_Team: number;
  Team_Name: string;
  Status: string;  // добавить это поле
  members: TeamMember[];
}


const TeamManagementPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isTeamModalVisible, setIsTeamModalVisible] = useState(false);
  const [isAddMembersModalVisible, setIsAddMembersModalVisible] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [teamForm] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [roles, setRoles] = useState<{ label: string; value: string }[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [archivedTeams, setArchivedTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');


  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/roles`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRoles(data.map((role: string) => ({ label: role, value: role })));
    } catch (err) {
      console.error(err);
      messageApi.error('Ошибка при загрузке ролей');
    }
  }, [messageApi]);
  
  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams`);
      if (!res.ok) throw new Error(await res.text());
      const data: Team[] = await res.json();
  
      const active = data.filter(t => t.Status !== 'Архив');
      const archived = data.filter(t => t.Status === 'Архив');
  
      setTeams(active);
      setArchivedTeams(archived);
    } catch (err) {
      console.error(err);
      messageApi.error('Ошибка при загрузке команд');
    }
  }, [messageApi]);
  
  
const fetchUsers = useCallback(async () => {
  try {
    const res = await fetch(`${API_URL}/api/employees`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const formattedUsers: User[] = data.map((u: { ID_User: number; First_Name: string; Last_Name: string; Email?: string }) => ({
      id: u.ID_User,
      fullName: `${u.First_Name} ${u.Last_Name}`,
      email: u.Email ?? 'no-email@example.com',
    }));
    
    setUsers(formattedUsers);
  } catch (err) {
    console.error(err);
    messageApi.error('Ошибка при загрузке сотрудников');
  }
}, [messageApi]);

  useEffect(() => {
    fetchTeams();
    fetchUsers();
    fetchRoles();
  }, [fetchTeams, fetchUsers, fetchRoles]);
  

  const handleExport = async (format: string) => {
    try {
      const response = await fetch(`http://localhost:3002/api/export/teams?format=${format}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      let extension = 'txt';
  
      if (format === 'excel') extension = 'xlsx';
      else if (format === 'word') extension = 'docx';
      else if (format === 'pdf') extension = 'pdf';
  
      a.href = url;
      a.download = `teams.${extension}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };
  
  
  const getTeamNameFilters = () => {
    const unique = Array.from(new Set(teams.map(t => t.Team_Name)));
    return unique.map(name => ({ text: name, value: name }));
  };

  const getRoleFilters = () => {
    const allRoles = teams.flatMap(t => t.members.map(m => m.role));
    const uniqueRoles = Array.from(new Set(allRoles));
    return uniqueRoles.map(role => ({ text: role, value: role }));
  };


  const handleAddMember = async (values: { userId: number; role: string }) => {
    if (!currentTeamId) return;
  
    const selectedUser = users.find(user => user.id === values.userId);
    if (!selectedUser) {
      messageApi.error('Пользователь не найден');
      return;
    }
  
    const body = {
      teamId: currentTeamId,
      fullName: selectedUser.fullName,
      email: selectedUser.email,
      role: values.role,
    };
  
    try {
      const res = await fetch(`${API_URL}/api/teams/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
  
      const result = await res.json();
      if (!res.ok) {
        messageApi.error(result.message || 'Ошибка при добавлении участника');
        return;
      }
  
      memberForm.resetFields();
      fetchTeams();
      messageApi.success('Участник добавлен');
    } catch (err) {
      console.error(err);
      messageApi.error('Ошибка при добавлении участника');
    }
  };
  

  const handleDeleteMember = async (teamId: number, memberId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/team/${teamId}/remove/${memberId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      messageApi.success('Участник удалён');
      fetchTeams();
    } catch (err) {
      console.error(err);
      messageApi.error('Ошибка при удалении участника');
    }
  };

  const handleDeleteTeam = async (teamId: number, teamName: string) => {
    try {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Team_Name: teamName }),
      });
  
      if (!res.ok) throw new Error(await res.text());
      messageApi.success('Команда отправлена в архив');
      fetchTeams();
    } catch (err) {
      console.error(err);
      messageApi.error('Ошибка при отправке команды в архив');
    }
  };
  
  const handleRestoreTeam = async (teamId: number, teamName: string) => {
    try {
      const res = await fetch(`${API_URL}/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Team_Name: teamName, Status: 'В процессе' }), // восстанавливаем
      });
  
      if (!res.ok) throw new Error(await res.text());
      messageApi.success('Команда восстановлена');
      fetchTeams();
    } catch (err) {
      console.error(err);
      messageApi.error('Ошибка при восстановлении команды');
    }
  };
  
  const columns: ColumnsType<Team> = [
    {
      title: <div style={{ textAlign: 'center' }}>Название команды</div>,
      dataIndex: 'Team_Name',
      key: 'Team_Name',
      align: 'left',  // Содержимое по левому краю
      filters: getTeamNameFilters(),
      onFilter: (value, record) => record.Team_Name === value,
    },
    {
      title: <div style={{ textAlign: 'center' }}>Участники</div>,
      key: 'members',
      align: 'left',  // Содержимое по левому краю
      filters: getRoleFilters(),
      onFilter: (value, record) => record.members.some(m => m.role === value),
      render: (_, team) => (
        <div>
          {team.members.map(m => (
            <div key={`${team.ID_Team}-${m.id}`}>
              {m.fullName} ({m.role}) — {m.email}
              <Button
                type="link"
                danger
                size="small"
                onClick={() => handleDeleteMember(team.ID_Team, m.id)}
                icon={<DeleteOutlined />}
                style={{ marginLeft: 8 }}
              >
                Удалить
              </Button>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>Действия</div>,
      key: 'actions',
      align: 'center',  // Кнопки по центру
      render: (_, team) => {
        if (showArchive) {
          return (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                type="default"
                style={{
                  minWidth: '150px',
                  justifyContent: 'center',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                }}
                onClick={() => handleRestoreTeam(team.ID_Team, team.Team_Name)}

              >
                Восстановить команду
              </Button>
            </div>
          );
        }
        
  
        return (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
            <Button
              type="default"
              icon={<EditOutlined />}
              style={{
                minWidth: '150px',
                justifyContent: 'center',
                border: '1px solid var(--border-color)',
                color: 'var(--text-color)',
              }}
              onClick={() => {
                setCurrentTeamId(team.ID_Team);
                setIsAddMembersModalVisible(true);
              }}
            >
              Добавить участников
            </Button>
            <Button
              type="default"
              icon={<DeleteOutlined />}
              danger
              style={{
                minWidth: '150px',
                justifyContent: 'center',
                border: '1px solid var(--border-color)',
              }}
              onClick={() => handleDeleteTeam(team.ID_Team, team.Team_Name)}

            >
              Удалить команду
            </Button>
          </div>
        );
      },
    },
  ];
  
  const handleCreateTeam = async (values: { name: string }) => {
    const teamName = values.name.trim();
    if (!teamName) return messageApi.error('Название команды не может быть пустым');
  
    const duplicate = teams.some(team => team.Team_Name.trim().toLowerCase() === teamName.toLowerCase());
    if (duplicate) return messageApi.error('Команда с таким названием уже существует');
  
    try {
      const res = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Team_Name: teamName, Status: 'В процессе' }), // статус активной команды
      });
  
      if (!res.ok) throw new Error(await res.text());
      await fetchTeams();
      teamForm.resetFields();
      setIsTeamModalVisible(false);
      messageApi.success('Команда успешно создана');
    } catch (err) {
      console.error(err);
      messageApi.error('Ошибка при создании команды');
    }
  };
  
  const filteredTeams = (showArchive ? archivedTeams : teams).filter(team => {
    const combinedFields = `${team.Team_Name} ${team.members.map(m => `${m.fullName} ${m.role} ${m.email}`).join(' ')}`.toLowerCase();
    return combinedFields.includes(searchTerm.toLowerCase());
  });
  
  
  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <AntdApp>
        {contextHolder}
        <div className="dashboard">
          <Header />
          <div className="dashboard-body">
            <SidebarManager />
            <main className="main-content team-management-page">

            <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '24px' }}>Управление командами</h1>
              <div className="button-wrapper" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <Button
  type="primary"
  className="create-team-button"
  onClick={() => setIsTeamModalVisible(true)}
>
  Создать команду
</Button>

  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
    <Input
      placeholder="Поиск по всем данным..."
      allowClear
      onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
      style={{ width: 250 }}
    />
    <Button onClick={() => setShowArchive(!showArchive)} icon={<InboxOutlined />}>
      {showArchive ? 'Назад к активным командам' : 'Архив команд'}
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
</div>




<h2 style={{ marginBottom: '8px', fontWeight: '400' }}>
  {showArchive ? 'Удалённые команды' : 'Список команд'}
</h2>



<Table
  dataSource={filteredTeams}


                columns={columns}
                rowKey="ID_Team"
                style={{ marginTop: 20 }}
                pagination={{ pageSize: 5 }}
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
  name="userId"
  label="Сотрудник"
  rules={[{ required: true, message: 'Выберите сотрудника' }]}
>
<Select
  showSearch
  placeholder="Выберите сотрудника"
  optionFilterProp="children"
  allowClear
>
  {users.map(user => (
    <Select.Option key={user.id} value={user.id}>
  {user.fullName} — {user.email}
</Select.Option>

  ))}
</Select>

</Form.Item>

<Form.Item
  name="role"
  label="Должность"
  rules={[{ required: true, message: 'Выберите должность' }]}
>
  <Select
    options={roles}
    showSearch
    optionFilterProp="label"
    allowClear
  />
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
      </AntdApp>
    </ConfigProvider>
  );
};

export default TeamManagementPage;
