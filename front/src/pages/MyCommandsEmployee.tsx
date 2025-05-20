import React, { useEffect, useState } from 'react';
import { Table, ConfigProvider, theme, message, Tabs, Input, Button, Dropdown } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import Header from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
import '../styles/pages/TeamManagementPage.css';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface TeamMember {
  ID_User: number;
  fullName: string;
  email: string;
  role: string;
}

interface Team {
  ID_Team: number;
  Team_Name: string;
  members: TeamMember[];
}

interface Project {
  ID_Order: number;
  Order_Name: string;
  Type_Name: string;
  Creation_Date: string;
  End_Date: string;
  Status: string;
  Team_Name?: string;
}

const MyCommandsEmployee: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<string>('teams');
  const [teamSearch, setTeamSearch] = useState<string>('');
  const [projectSearch, setProjectSearch] = useState<string>('');

  const fetchTeamsAndProjects = async () => {
    try {
      const resTeams = await fetch(`${API_URL}/api/teams`);
      const resProjects = await fetch(`${API_URL}/api/projects`);
      if (!resTeams.ok || !resProjects.ok) throw new Error();

      const allTeams: Team[] = await resTeams.json();
      const allProjects: Project[] = await resProjects.json();
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = currentUser?.email;

      const userTeams = allTeams.filter(team =>
        team.members.some(member => member.email === userEmail)
      );
      const userTeamNames = userTeams.map(t => t.Team_Name);
      const userProjects = allProjects.filter(p => userTeamNames.includes(p.Team_Name || ''));

      setTeams(userTeams);
      setProjects(userProjects);
    } catch {
      messageApi.error('Ошибка при загрузке данных');
    }
  };

  useEffect(() => {
    fetchTeamsAndProjects();
  }, []);

  const exportHandler = async (type: 'teams' | 'projects', format: 'xlsx' | 'pdf' | 'docx') => {
    try {
      const endpoint = type === 'teams' ? 'teams' : 'projects';
      const res = await fetch(`${API_URL}/api/export/${endpoint}?format=${format === 'xlsx' ? 'excel' : format}`);
      if (!res.ok) throw new Error();
  
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${endpoint}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      messageApi.error('Ошибка экспорта данных');
    }
  };
  

  const teamColumns: ColumnsType<Team> = [
    {
      title: <div style={{ textAlign: 'center' }}>Название команды</div>,
      dataIndex: 'Team_Name',
      key: 'Team_Name',
      align: 'center',
      render: (text: string) => <div style={{ textAlign: 'left' }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: 'center' }}>Роль участника</div>,
      key: 'members',
      align: 'center',
      render: (_: unknown, team: Team) =>
        team.members.map((m, index) => (
          <div key={`${m.ID_User}-${index}`} style={{ textAlign: 'left', marginBottom: 6 }}>
            {m.fullName} ({m.role}) — {m.email}
          </div>
        )),
    },
  ];

  const projectColumns: ColumnsType<Project> = [
    {
      title: <div style={{ textAlign: 'center' }}>Название проекта</div>,
      dataIndex: 'Order_Name',
      key: 'Order_Name',
      align: 'center',
      render: (text: string) => <div style={{ textAlign: 'left' }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: 'center' }}>Тип проекта</div>,
      dataIndex: 'Type_Name',
      key: 'Type_Name',
      align: 'center',
      render: (text: string) => <div style={{ textAlign: 'left' }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: 'center' }}>Дата создания</div>,
      dataIndex: 'Creation_Date',
      key: 'Creation_Date',
      align: 'center',
      render: (date: string) => <div style={{ textAlign: 'left' }}>{dayjs(date).format('YYYY-MM-DD')}</div>,
    },
    {
      title: <div style={{ textAlign: 'center' }}>Дата окончания</div>,
      dataIndex: 'End_Date',
      key: 'End_Date',
      align: 'center',
      render: (date: string | null) => <div style={{ textAlign: 'left' }}>{date ? dayjs(date).format('YYYY-MM-DD') : ''}</div>,
    },
    {
      title: <div style={{ textAlign: 'center' }}>Статус</div>,
      dataIndex: 'Status',
      key: 'Status',
      align: 'center',
      render: (text: string) => <div style={{ textAlign: 'left' }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: 'center' }}>Команда</div>,
      dataIndex: 'Team_Name',
      key: 'Team_Name',
      align: 'center',
      render: (text: string | undefined) => <div style={{ textAlign: 'left' }}>{text || 'Без команды'}</div>,
    },
  ];

  const filteredTeams = teams.filter(team =>
    team.Team_Name.toLowerCase().includes(teamSearch.toLowerCase()) ||
    team.members.some(m => m.fullName.toLowerCase().includes(teamSearch.toLowerCase()))
  );

  const filteredProjects = projects.filter(project =>
    project.Order_Name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    project.Type_Name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    project.Status.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const renderExportMenu = (type: 'teams' | 'projects') => (
    <Dropdown
      menu={{
        items: [
          { key: 'docx', label: 'Экспорт в Word (.docx)', onClick: () => exportHandler(type, 'docx') },
          { key: 'xlsx', label: 'Экспорт в Excel (.xlsx)', onClick: () => exportHandler(type, 'xlsx') },
          { key: 'pdf', label: 'Экспорт в PDF (.pdf)', onClick: () => exportHandler(type, 'pdf') },
        ],
      }}
    >
      <Button icon={<DownloadOutlined />}>Экспорт</Button>
    </Dropdown>
  );
  

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      {contextHolder}
      <div className="dashboard">
        <Header />
        <div className="dashboard-body">
          <Sidebar role="employee" />
          <main className="main-content">
          <h1
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  marginBottom: "24px",
                }}
              >Данные командам и проектов</h1>
            <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" items={[
              {
                key: 'teams',
                label: 'Мои команды',
                children: (
                  <>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Input
                        placeholder="Поиск по командам..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        style={{ width: 250 }}
                      />
                      {renderExportMenu('teams')}
                    </div>
                    <Table
                      dataSource={filteredTeams}
                      columns={teamColumns}
                      rowKey="ID_Team"
                      pagination={{ pageSize: 5 }}
                    />
                  </>
                )
              },
              {
                key: 'projects',
                label: 'Мои проекты',
                children: (
                  <>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Input
                        placeholder="Поиск по проектам..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        style={{ width: 250 }}
                      />
                      {renderExportMenu('projects')}
                    </div>
                    <Table
                      dataSource={filteredProjects}
                      columns={projectColumns}
                      rowKey="ID_Order"
                      pagination={{ pageSize: 5 }}
                    />
                  </>
                )
              }
            ]} />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default MyCommandsEmployee;
