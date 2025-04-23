import React, { useEffect, useState } from 'react';
import { Table, ConfigProvider, theme, message, TableColumnsType } from 'antd';
import Header from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
import '../styles/pages/TeamManagementPage.css';

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

const MyCommandsEmployee: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teams`);
        if (!res.ok) throw new Error();
        const allTeams: Team[] = await res.json();
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userEmail = currentUser?.email;

        const userTeams = allTeams.filter(team =>
          team.members.some(member => member.email === userEmail)
        );
        setTeams(userTeams);
      } catch {
        messageApi.error('Ошибка при загрузке команд');
      }
    };

    fetchTeams();
  }, [messageApi]);

  const getTeamFilters = () => {
    const unique = Array.from(new Set(teams.map(t => t.Team_Name)));
    return unique.map(name => ({ text: name, value: name }));
  };

  const getRoleFilters = () => {
    const roles = teams.flatMap(t => t.members.map(m => m.role));
    const unique = Array.from(new Set(roles));
    return unique.map(role => ({ text: role, value: role }));
  };

  const columns: TableColumnsType<Team> = [
    {
      title: 'Название команды',
      dataIndex: 'Team_Name',
      key: 'Team_Name',
      filters: getTeamFilters(),
      onFilter: (value, record) => record.Team_Name === value,
    },
    {
      title: 'Роль участника',
      key: 'members',
      filters: getRoleFilters(),
      onFilter: (value, record) =>
        record.members.some(m => m.role === value),
      render: (_, team) =>
        team.members.map((m, index) => (
          <div key={`${m.ID_User}-${index}`} style={{ marginBottom: 6 }}>
            {m.fullName} ({m.role}) — {m.email}
          </div>
        )),
    },
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
              columns={columns}
              rowKey="ID_Team"
              style={{ marginTop: 20 }}
              pagination={{ pageSize: 5 }}
            />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default MyCommandsEmployee;
