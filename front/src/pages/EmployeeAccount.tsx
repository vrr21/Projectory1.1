import React from 'react';
import { Card, Typography, Avatar, Divider } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/useAuth';
import AppHeader from '../components/Header';
import '../styles/pages/EmployeeAccount.css';

const { Title, Text } = Typography;

const EmployeeAccount: React.FC = () => {
  const { user } = useAuth();

  if (!user) return <div className="dashboard">Загрузка...</div>;

  const fullName = `${user.lastName} ${user.firstName}`;

  return (
    <div className="dashboard">
      <AppHeader />
      <div className="account-container">
        <Card className="account-card" bordered={false}>
          <div className="avatar-wrapper">
            <Avatar size={100} icon={<UserOutlined />} />
          </div>
          <Title level={3} style={{ color: 'var(--text-color)' }}>{fullName}</Title>
          <Text className="role-text">{user.role}</Text>
          <Divider style={{ borderColor: 'var(--accent-color)' }} />
          <div className="info-item">
            <MailOutlined className="icon" />
            <Text className="info-text">{user.email}</Text>
          </div>
          <div className="info-item">
            <PhoneOutlined className="icon" />
            <Text className="info-text">+7 (999) 999-99-99</Text> {/* Можно заменить, если phone добавите */}
          </div>
        </Card>

        <div className="bottom-content">
          <Title level={4} style={{ color: 'var(--text-color)' }}>Обзор активности</Title>
          <p style={{ color: 'var(--text-color)' }}>
            Здесь можно разместить Канбан-доску, статистику задач или отчёты.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAccount;
