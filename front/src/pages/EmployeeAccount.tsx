// src/pages/EmployeeAccount.tsx
import React, { useState, useEffect } from 'react';
import { Card, Typography, Avatar, Divider, Upload, message } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadChangeParam } from 'antd/es/upload';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import { useAuth } from '../contexts/useAuth';
import AppHeader from '../components/Header';
import '../styles/pages/EmployeeAccount.css';

const { Title, Text } = Typography;

const EmployeeAccount: React.FC = () => {
  const { user, setUser } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.avatar) {
      setAvatarUrl(`${import.meta.env.VITE_API_URL}/uploads/${user.avatar}`);
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
    formData.append('userId', String(user?.id || '')); // обязательный userId

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload-avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Ошибка при загрузке аватара');
      }

      const data = await response.json();
      const newAvatar = data.filename;
      const fullAvatarUrl = `${import.meta.env.VITE_API_URL}/uploads/${newAvatar}`;
      setAvatarUrl(fullAvatarUrl);

      // Обновление user в AuthContext
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
      <AppHeader />
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
          <p className="text-color">
            Здесь можно разместить Канбан-доску, статистику задач или отчёты.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAccount;
