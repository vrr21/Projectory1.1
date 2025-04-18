import React, { useEffect, useState, useCallback } from 'react';
import { Button, Table, Modal, Form, Input, message, ConfigProvider, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/pages/TeamManagementPage.css';

const { darkAlgorithm } = theme;

interface TeamMember {
  id: number;
  email: string;
  fullName: string;
}

interface Team {
  id: number;
  name: string;
  members: TeamMember[];
}

const TeamManagementPage: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isMemberModalVisible, setIsMemberModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [newMemberForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchJSON = async <T,>(url: string): Promise<T> => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        console.error('Ошибка при запросе:', res.status, text);
        throw new Error(`Ошибка HTTP: ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error('Ошибка запроса:', error);
      throw error;
    }
  };

  const fetchMembers = useCallback(async () => {
    try {
      const data = await fetchJSON<TeamMember[]>('/api/members');
      setMembers(data);
    } catch {
      messageApi.error('Ошибка при загрузке сотрудников');
    }
  }, [messageApi]);

  const fetchTeams = useCallback(async () => {
    try {
      const data = await fetchJSON<Team[]>('/api/teams');
      setTeams(data);
    } catch {
      messageApi.error('Ошибка при загрузке команд');
    }
  }, [messageApi]);

  useEffect(() => {
    fetchMembers();
    fetchTeams();
  }, [fetchMembers, fetchTeams]);

  const handleCreateTeam = async (values: { name: string }) => {
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name }),
      });
      if (!res.ok) throw new Error('Ошибка HTTP');
      messageApi.success('Команда создана!');
      form.resetFields();
      setIsModalVisible(false);
      setIsMemberModalVisible(true);
      fetchTeams();
    } catch {
      messageApi.error('Ошибка при создании команды');
    }
  };

  const handleAddMemberInline = async (values: { fullName: string; email: string }) => {
    try {
      const res = await fetch('/api/team/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error('Ошибка HTTP');
      messageApi.success('Участник добавлен!');
      newMemberForm.resetFields();
      fetchMembers();
    } catch {
      messageApi.error('Ошибка при добавлении участника');
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка HTTP');
      messageApi.success('Команда удалена');
      fetchTeams();
    } catch {
      messageApi.error('Ошибка при удалении команды');
    }
  };

  const handleDeleteMember = async (teamId: number, memberId: number) => {
    try {
      const res = await fetch(`/api/team/${teamId}/remove/${memberId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка HTTP');
      messageApi.success('Участник удалён');
      fetchTeams();
    } catch {
      messageApi.error('Ошибка при удалении участника');
    }
  };

  const columns: ColumnsType<Team> = [
    {
      title: 'Название команды',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Участники',
      key: 'members',
      render: (_, record) => record.members.map((m) => m.fullName).join(', '),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <div>
          <Button type="link" danger onClick={() => handleDeleteTeam(record.id)}>
            Удалить команду
          </Button>
          {record.members.map((m) => (
            <Button
              key={m.id}
              type="link"
              danger
              onClick={() => handleDeleteMember(record.id, m.id)}
            >
              Удалить участника {m.fullName}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      {contextHolder}
      <div className="dashboard">
        <Header />
        <div className="dashboard-body">
          <Sidebar role="manager" />
          <main className="main-content">
            <h1>Управление командами</h1>
            <Button type="primary" onClick={() => setIsModalVisible(true)}>
              Создать команду
            </Button>

            <Table dataSource={teams} columns={columns} rowKey="id" style={{ marginTop: 20 }} />

            <Modal
              title="Создание команды"
              open={isModalVisible}
              onCancel={() => setIsModalVisible(false)}
              onOk={() => form.submit()}
              okText="Создать"
            >
              <Form form={form} layout="vertical" onFinish={handleCreateTeam}>
                <Form.Item
                  name="name"
                  label="Название команды"
                  rules={[{ required: true, message: 'Введите название команды' }]}
                >
                  <Input />
                </Form.Item>
              </Form>
            </Modal>

            <Modal
              title="Добавление участника"
              open={isMemberModalVisible}
              onCancel={() => setIsMemberModalVisible(false)}
              footer={null}
            >
              <Form form={newMemberForm} layout="vertical" onFinish={handleAddMemberInline}>
                <Form.Item
                  name="fullName"
                  label="Полное имя"
                  rules={[{ required: true, message: 'Введите имя' }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Введите email' },
                    { type: 'email', message: 'Неверный формат' },
                  ]}
                >
                  <Input />
                </Form.Item>
                <Form.Item>
                  <Button type="dashed" htmlType="submit">
                    Добавить участника
                  </Button>
                </Form.Item>
              </Form>

              <Table<TeamMember>
                dataSource={members}
                columns={[
                  { title: 'ФИО', dataIndex: 'fullName', key: 'fullName' },
                  { title: 'Email', dataIndex: 'email', key: 'email' },
                ]}
                rowKey="id"
                style={{ marginTop: 20 }}
              />
            </Modal>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default TeamManagementPage;
