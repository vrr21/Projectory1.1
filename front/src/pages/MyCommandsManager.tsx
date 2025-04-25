import React, { useEffect, useState } from 'react';
import { Table, ConfigProvider, theme, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import HeaderManager from '../components/HeaderManager';
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
  id: number;
  name: string;
  members: TeamMember[];
}

interface RawTeamMember {
  ID_User?: number;
  fullName: string;
  email: string;
  role: string;
}

interface RawTeam {
  ID_Team: number;
  Team_Name: string;
  members: RawTeamMember[];
}

const MyCommandsManager: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teams`);
        if (!res.ok) {
          messageApi.error('Ошибка при загрузке данных');
          return;
        }

        const allTeams: RawTeam[] = await res.json();
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userEmail = currentUser?.email;

        const userTeams: Team[] = allTeams
          .filter((team) =>
            Array.isArray(team.members) &&
            team.members.some((member) => member.email === userEmail)
          )
          .map((team) => ({
            id: team.ID_Team,
            name: team.Team_Name,
            members: team.members.map((member, idx) => ({
              id: member.ID_User ?? idx,
              fullName: member.fullName,
              email: member.email,
              role: member.role,
            })),
          }));

        setTeams(userTeams);
      } catch {
        messageApi.error('Ошибка при загрузке команд');
      }
    };

    fetchTeams();
  }, [messageApi]);

  const getTeamFilters = () =>
    Array.from(new Set(teams.map(team => team.name)))
      .map(name => ({ text: name, value: name }));

  const getRoleFilters = () =>
    Array.from(new Set(teams.flatMap(team => team.members.map(member => member.role))))
      .map(role => ({ text: role, value: role }));

  const columns: ColumnsType<Team> = [
    {
      title: 'Название команды',
      dataIndex: 'name',
      key: 'name',
      filters: getTeamFilters(),
      onFilter: (value, record) => record.name === value,
    },
    {
      title: 'Участники',
      key: 'members',
      filters: getRoleFilters(),
      onFilter: (value, record) =>
        record.members.some(member => member.role === value),
      render: (_, team) => (
        <>
          {team.members?.map((m) => (
            <div key={`member-${team.id}-${m.email}-${m.role}`}>
              {m.fullName} ({m.role}) — {m.email}
            </div>
          ))}
        </>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      {contextHolder}
      <div className="dashboard">
        <HeaderManager />
        <div className="dashboard-body">
          <SidebarManager />
          <main className="main-content">
            <h1>Мои команды</h1>
            <Table
              dataSource={teams}
              columns={columns}
              rowKey="id"
              style={{ marginTop: 20 }}
              pagination={{ pageSize: 5 }}
            />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default MyCommandsManager;
