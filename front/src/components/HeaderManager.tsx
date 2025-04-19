import React, { useState } from 'react';
import { Layout, Input, Badge, Avatar, Dropdown, Modal } from 'antd';
import { BellOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import '../styles/components/Header.css';

const { Header } = Layout;

const HeaderManager: React.FC = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleConfirmLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const profileMenu = {
    items: [
      { key: '1', label: <span onClick={() => navigate('/profile')}>Профиль</span> },
      { key: '2', label: <span onClick={() => setIsModalVisible(true)}>Выйти</span> },
    ],
  };

  return (
    <>
      <Header className="header">
        <div className="logo" onClick={() => navigate('/manager')} style={{ cursor: 'pointer' }}>
          ProjectApp
        </div>
        <div className="right-section">
          <Input className="search-input" placeholder="Поиск..." prefix={<SearchOutlined />} />
          <Badge count={0} className="icon">
            <BellOutlined style={{ fontSize: '20px', color: '#fff' }} />
          </Badge>
          <Dropdown menu={profileMenu} placement="bottomRight">
            <Avatar style={{ backgroundColor: '#006F7A', marginLeft: '16px' }} icon={<UserOutlined />} />
          </Dropdown>
        </div>
      </Header>

      <Modal
        title="Подтверждение"
        open={isModalVisible}
        onOk={handleConfirmLogout}
        onCancel={() => setIsModalVisible(false)}
        okText="Да"
        cancelText="Отмена"
        className="dark-modal"
      >
        <p>Вы действительно хотите выйти из аккаунта?</p>
      </Modal>
    </>
  );
};

export default HeaderManager;
