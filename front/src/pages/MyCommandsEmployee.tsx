import React, { useEffect, useState } from 'react';
import { Table, ConfigProvider, theme, message } from 'antd';
import Header from '../components/HeaderEmployee';
import Sidebar from '../components/Sidebar';
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
  id: number;
  name: string;
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

  const columns = [
    { title: 'Название команды', dataIndex: 'name', key: 'name' },
    {
      title: 'Участники',
      key: 'members',
      render: (_: unknown, team: Team) =>
        team.members.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
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
            <Table dataSource={teams} columns={columns} rowKey="id" style={{ marginTop: 20 }} />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default MyCommandsEmployee;
