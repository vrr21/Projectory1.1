import React, { useState, useEffect } from 'react';
import {
  Card, Typography, Avatar, Divider, Upload, message, Table, ConfigProvider, theme
} from 'antd';
import {
  UserOutlined, MailOutlined, PhoneOutlined, UploadOutlined
} from '@ant-design/icons';
import type { UploadChangeParam } from 'antd/es/upload';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import { useAuth } from '../contexts/useAuth';
import HeaderManager from '../components/HeaderManager';
import HeaderEmployee from '../components/HeaderEmployee';
import '../styles/pages/EmployeeAccount.css';

const { Title, Text } = Typography;
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

const EmployeeAccount: React.FC = () => {
  const { user, setUser } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (user?.avatar) {
      setAvatarUrl(`${API_URL}/uploads/${user.avatar}`);
    }
  }, [user]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teams`);
        if (!res.ok) throw new Error();
        const allTeams: Team[] = await res.json();
        const userEmail = user?.email;

        const userTeams = allTeams.filter(team =>
          team.members.some(m => m.email === userEmail)
        );
        setTeams(userTeams);
      } catch {
        message.error('Ошибка загрузки команд');
      }
    };

    if (user) {
      fetchTeams();
    }
  }, [user]);

  const handleAvatarUpload = async (info: UploadChangeParam<UploadFile<RcFile>>) => {
    const file = info.file.originFileObj;
    if (!file) {
      message.error('Не удалось получить файл');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('userId', String(user?.id || ''));

    try {
      const response = await fetch(`${API_URL}/api/upload-avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Ошибка при загрузке аватара');
      const data = await response.json();
      const newAvatar = data.filename;
      const fullAvatarUrl = `${API_URL}/uploads/${newAvatar}`;
      setAvatarUrl(fullAvatarUrl);
      if (user) setUser({ ...user, avatar: newAvatar });
      message.success('Аватар обновлён');
    } catch (error) {
      console.error(error);
      message.error('Ошибка при загрузке аватара');
    }
  };

  if (!user) return <div className="dashboard">Загрузка...</div>;

  const fullName = user.name || `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim();
  const normalizedRole = String(user.role).toLowerCase();

  const teamColumns = [
    {
      title: 'Команда',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Участники',
      key: 'members',
      render: (_: unknown, team: Team) =>
        team.members.map(m => (
          <div key={m.id}>
            {m.fullName} ({m.role}) — {m.email}
          </div>
        )),
    },
  ];

  const isManager = normalizedRole === 'менеджер' || normalizedRole === 'менеджер (администратор)';

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <div className="dashboard">
        {isManager ? <HeaderManager /> : <HeaderEmployee />}
        <div className="dashboard-body account-page-centered">
          <main className="main-content account-content">
            <div className="account-container">
              <Card className="account-card" variant="outlined">
                <div className="avatar-wrapper">
                  <Avatar
                    size={100}
                    src={avatarUrl || undefined}
                    icon={!avatarUrl ? <UserOutlined /> : undefined}
                    alt="User Avatar"
                    style={{ backgroundColor: '#444' }}
                  />
                </div>

                <Upload showUploadList={false} beforeUpload={() => false} onChange={handleAvatarUpload}>
                  <label className="upload-label">
                    <UploadOutlined /> Загрузить аватар
                  </label>
                </Upload>

                <Title level={3} className="text-color">{fullName}</Title>
                <Text className="role-text">{user.role}</Text>
                <Divider className="accent-divider" />
                <div className="info-item">
                  <MailOutlined className="icon" />
                  <Text className="info-text">{user.email}</Text>
                </div>
                <div className="info-item">
                  <PhoneOutlined className="icon" />
                  <Text className="info-text">{user.phone ?? '+7 (999) 999-99-99'}</Text>
                </div>
              </Card>

              <div className="bottom-content">
                <Title level={4} className="text-color">Мои команды</Title>
                <Table
                  dataSource={teams}
                  columns={teamColumns}
                  rowKey="id"
                  className="dark-table"
                  pagination={false}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default EmployeeAccount;
