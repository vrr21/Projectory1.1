import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Avatar,
  Divider,
  Upload,
  message,
  List,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  UploadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { UploadChangeParam } from 'antd/es/upload';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import { useAuth } from '../contexts/useAuth';
import HeaderEmployee from '../components/HeaderEmployee';
import '../styles/pages/EmployeeAccount.css';

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
        const teams = allTeams.filter(t =>
          t.members.some(m => m.email === user?.email)
        );
        setUserTeams(teams);
      } catch {
        message.error('Ошибка при загрузке команд');
      }
    };

    if (user?.email) fetchUserTeams();
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

      if (!response.ok) {
        throw new Error('Ошибка при загрузке аватара');
      }

      const data = await response.json();
      const newAvatar = data.filename;
      const fullAvatarUrl = `${API_URL}/uploads/${newAvatar}`;
      setAvatarUrl(fullAvatarUrl);

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

  const fullName = user.name || `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim();

  return (
    <div className="dashboard">
      <HeaderEmployee />
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
          <Title level={4} className="text-color">Обзор активности</Title>
          <p className="text-color">Можно добавить информацию о проектах, задачах и показателях.</p>

          <Divider />

          <Title level={4} className="text-color"><TeamOutlined /> Мои команды</Title>
          <List
            dataSource={userTeams}
            renderItem={team => (
              <List.Item key={team.id}>
                <List.Item.Meta
                  title={<span className="text-color">{team.name}</span>}
                  description={
                    <div>
                      {team.members.map(m => (
                        <div key={m.id}>{m.fullName} ({m.role})</div>
                      ))}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default ManagerAccount;
