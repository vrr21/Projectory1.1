import React, { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Avatar,
  Divider,
  Upload,
  message,
  Tabs,
  Table,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  UploadOutlined,
  TeamOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { UploadChangeParam } from 'antd/es/upload';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import { useAuth } from '../contexts/useAuth';
import HeaderManager from '../components/HeaderManager';
import ManagerReports from '../components/ManagerReports';
import '../styles/pages/ManagerAccount.css';

const { Title, Text } = Typography;
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

const ManagerAccount: React.FC = () => {
  const { user, setUser } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (user?.avatar) {
      setAvatarUrl(`${API_URL}/uploads/${user.avatar}`);
    }
  }, [user]);

  useEffect(() => {
    const fetchUserTeams = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teams`);
        if (!res.ok) throw new Error();
        const allTeams: Team[] = await res.json();
        const teams = allTeams.filter((t) =>
          t.members.some((m) => m.email === user?.email)
        );
        setUserTeams(teams);
      } catch {
        message.error('Ошибка при загрузке команд');
      }
    };

    if (user?.email) fetchUserTeams();
  }, [user]);

  const handleAvatarUpload = async (
    info: UploadChangeParam<UploadFile<RcFile>>
  ) => {
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
      setAvatarUrl(`${API_URL}/uploads/${newAvatar}`);

      if (user) {
        setUser({ ...user, avatar: newAvatar });
      }

      message.success('Аватар успешно обновлён!');
    } catch (error) {
      console.error(error);
      message.error('Ошибка при загрузке аватара');
    }
  };

  if (!user) return <div className="dashboard">Загрузка...</div>;

  const fullName =
    user.name || `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim();

  const teamColumns = [
    { title: 'Команда', dataIndex: 'name', key: 'name' },
    {
      title: 'Участники',
      key: 'members',
      render: (_: unknown, team: Team) => (
        <div>
          {team.members.map((m, idx) => (
            <div key={`member-${team.id}-${m.id || idx}`}>
              {m.fullName} ({m.role}) — {m.email}
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="dashboard">
      <HeaderManager />
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

          <Upload
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleAvatarUpload}
          >
            <label className="upload-label">
              <UploadOutlined /> Загрузить аватар
            </label>
          </Upload>

          <Title level={3} className="text-color">
            {fullName}
          </Title>
          <Text className="role-text">{user.role}</Text>
          <Divider className="accent-divider" />

          <div className="info-item">
            <MailOutlined className="icon" />
            <Text className="info-text">{user.email}</Text>
          </div>
          <div className="info-item">
            <PhoneOutlined className="icon" />
            <Text className="info-text">
              {user.phone ?? '+7 (999) 999-99-99'}
            </Text>
          </div>
        </Card>

        <div className="bottom-content">
          <Tabs
            defaultActiveKey="teams"
            type="card"
            items={[
              {
                key: 'teams',
                label: (
                  <>
                    <TeamOutlined /> Мои команды
                  </>
                ),
                children: (
                  <>
                    <Title level={4} className="text-color">Мои команды</Title>
                    <Table
                      dataSource={userTeams}
                      columns={teamColumns}
                      rowKey="id"
                      pagination={false}
                    />
                  </>
                ),
              },
              {
                key: 'reports',
                label: (
                  <>
                    <BarChartOutlined /> Все отчёты
                  </>
                ),
                children: <ManagerReports />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default ManagerAccount;
