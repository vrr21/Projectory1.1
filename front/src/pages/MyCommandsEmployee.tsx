import React, { useEffect, useState } from 'react';
import { Table, ConfigProvider, theme, message, TableColumnsType } from 'antd';
import Header from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
import '../styles/pages/TeamManagementPage.css';
import dayjs from 'dayjs';

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

  const teamColumns: TableColumnsType<Team> = [
    {
      title: 'Название команды',
      dataIndex: 'Team_Name',
      key: 'Team_Name',
    },
    {
      title: 'Роль участника',
      key: 'members',
      render: (_, team) =>
        team.members.map((m, index) => (
          <div key={`${m.ID_User}-${index}`} style={{ marginBottom: 6 }}>
            {m.fullName} ({m.role}) — {m.email}
          </div>
        )),
    },
  ];

  const projectColumns: TableColumnsType<Project> = [
    { title: 'Название проекта', dataIndex: 'Order_Name', key: 'Order_Name' },
    { title: 'Тип проекта', dataIndex: 'Type_Name', key: 'Type_Name' },
    {
      title: 'Дата создания',
      dataIndex: 'Creation_Date',
      key: 'Creation_Date',
      render: date => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Дата окончания',
      dataIndex: 'End_Date',
      key: 'End_Date',
      render: date => date ? dayjs(date).format('YYYY-MM-DD') : '',
    },
    { title: 'Статус', dataIndex: 'Status', key: 'Status' },
    { title: 'Команда', dataIndex: 'Team_Name', key: 'Team_Name' },
  ];

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      {contextHolder}
      <div className="dashboard">
        <Header />
        <div className="dashboard-body">
          <Sidebar role="employee" />
          <main className="main-content">
  <h1>Мои команды</h1>
  <Table
    dataSource={teams}
    columns={teamColumns}
    rowKey="ID_Team"
    pagination={{ pageSize: 5 }}
    style={{ marginBottom: 40 }}
  />

  <hr style={{ borderColor: '#555', margin: '1px 0' }} />

  <h1>Мои проекты</h1>
  <Table
    dataSource={projects}
    columns={projectColumns}
    rowKey="ID_Order"
    pagination={{ pageSize: 5 }}
  />
</main>

        </div>
      </div>
    </ConfigProvider>
  );
};

export default MyCommandsEmployee;
