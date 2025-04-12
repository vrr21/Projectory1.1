import React from 'react';
import { Layout, Menu, Input, Badge, Avatar, Dropdown } from 'antd';
import {
  BellOutlined,
  UserOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import '../styles/components/Header.css';

const { Header } = Layout;

const profileMenu = {
  items: [
    { key: '1', label: <a href="/profile">Профиль</a> },
    { key: '2', label: <a href="/logout">Выйти</a> },
  ],
};

const AppHeader: React.FC = () => {
  return (
    <Header className="header">
      <div className="logo">ProjectApp</div>
      <Menu
        theme="dark"
        mode="horizontal"
        className="menu"
        items={[
          { key: '1', label: <a href="/dashboard">Доска</a> },
          { key: '2', label: <a href="/projects">Проекты</a> },
          { key: '3', label: <a href="/teams">Команды</a> },
        ]}
      />
      <div className="right-section">
        <Input
          className="search-input"
          placeholder="Поиск..."
          prefix={<SearchOutlined />}
        />
        <Badge count={0} className="icon">
          <BellOutlined style={{ fontSize: '20px', color: '#fff' }} />
        </Badge>
        <Dropdown menu={profileMenu} placement="bottomRight">
          <Avatar
            style={{ backgroundColor: '#006F7A', marginLeft: '16px' }}
            icon={<UserOutlined />}
          />
        </Dropdown>
      </div>
    </Header>
  );
};

export default AppHeader;
