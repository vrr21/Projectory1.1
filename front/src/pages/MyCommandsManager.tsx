import React, { useEffect, useState } from 'react';
import { Table, ConfigProvider, theme, message, Avatar, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import HeaderManager from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import '../styles/pages/TeamManagementPage.css';
import { Button, Dropdown } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface TeamMember {
  id: number;
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
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
  avatar?: string;
}

interface RawTeam {
  ID_Team: number;
  Team_Name: string;
  members: RawTeamMember[];
}

const MyCommandsManager: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const navigate = useNavigate();
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
          .filter(
            (team) =>
              Array.isArray(team.members) &&
              team.members.some((member) => member.email === userEmail)
          )
          .map((team) => ({
            id: team.ID_Team,
            name: team.Team_Name,
            members: team.members
              .filter((member) => typeof member.ID_User === 'number')
              .map((member) => ({
                id: member.ID_User as number,
                fullName: member.fullName,
                email: member.email,
                role: member.role,
                avatar: member.avatar,
              })),
          }));

        setTeams(userTeams);
      } catch {
        messageApi.error('Ошибка при загрузке команд');
      }
    };

    fetchTeams();
  }, [messageApi]);

  const handleAvatarClick = (id: number) => {
    navigate(`/employee/${id}`);
  };

  const columns: ColumnsType<Team> = [
    {
      title: <div style={{ textAlign: 'center' }}>Название команды</div>,
      dataIndex: 'name',
      key: 'name',
      align: 'left',
      render: (text: string) => <div style={{ textAlign: 'left' }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: 'center' }}>Участники</div>,
      key: 'members',
      align: 'left',
      render: (_, team) => (
        <div style={{ textAlign: 'left' }}>
          {team.members.map((m) => `${m.fullName} (${m.role}) — ${m.email}`).join(', ')}
        </div>
      ),
    },
  ];

  const allUniqueMembers = Array.from(
    new Map(
      teams
        .flatMap((team) => team.members)
        .map((m) => [m.id, m])
    ).values()
  );

  const renderExportMenu = () => (
    <Dropdown
      menu={{
        items: [
          { key: 'docx', label: 'Экспорт в Word (.docx)', onClick: () => exportHandler('docx') },
          { key: 'xlsx', label: 'Экспорт в Excel (.xlsx)', onClick: () => exportHandler('xlsx') },
          { key: 'pdf', label: 'Экспорт в PDF (.pdf)', onClick: () => exportHandler('pdf') },
        ],
      }}
    >
      <Button icon={<DownloadOutlined />}>Экспорт</Button>
    </Dropdown>
  );

  const exportHandler = async (format: 'xlsx' | 'pdf' | 'docx') => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = currentUser?.email;

      const res = await fetch(`${API_URL}/api/export/teams/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: format === 'xlsx' ? 'excel' : format,
          teams,
          userEmail,
        }),
      });

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teams.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      messageApi.error('Ошибка экспорта данных');
    }
  };

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      {contextHolder}
      <div className="dashboard">
        <HeaderManager />
        <div className="dashboard-body">
          <SidebarManager />
          <main className="main-content">
            <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '24px' }}>
              Мои команды
            </h1>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -20, marginBottom: -30 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {allUniqueMembers.map((m, index) => (
                  <Tooltip key={m.id} title={m.fullName}>
                    <Avatar
                      src={m.avatar && m.avatar !== 'null' ? `${API_URL}/uploads/${encodeURIComponent(m.avatar)}` : undefined}
                      size={40}
                      style={{
                        marginLeft: index === 0 ? 0 : -10,
                        zIndex: 100 - index,
                        border: '2px solid #1f1f1f',
                        cursor: 'pointer',
                        backgroundColor: !m.avatar || m.avatar === 'null' ? '#777' : 'transparent',
                      }}
                      onClick={() => handleAvatarClick(m.id)}
                    >
                      {!m.avatar || m.avatar === 'null'
                        ? m.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                        : null}
                    </Avatar>
                  </Tooltip>
                ))}
              </div>
              {renderExportMenu()}
            </div>

            <Table
              dataSource={teams}
              columns={columns}
              rowKey="id"
              style={{ marginTop: 20 }}
              pagination={false}
            />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default MyCommandsManager;