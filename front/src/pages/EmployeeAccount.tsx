import React, { useState, useEffect } from "react";
import { Card, Typography, Avatar, Divider, Upload, App, message, Input, Button } from "antd";
import {
  MailOutlined,
  PhoneOutlined,
  UploadOutlined,
  FileTextOutlined,
  TeamOutlined,
  ProjectOutlined,
  PushpinOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  EditOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import type { UploadChangeParam } from "antd/es/upload";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import { useAuth } from "../contexts/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import HeaderEmployee from "../components/HeaderEmployee";
import "../styles/pages/EmployeeAccount.css";

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL;

interface Team {
  ID_Team: number;
  Team_Name: string;
  members: { email: string }[];
}
interface Project {
  ID_Order: number;
  Order_Name: string;
  ID_Team: number;
}
interface Task {
  ID_Task: number;
  Task_Name: string;
  Status_Name: string;
}

const EmployeeAccount: React.FC = () => {
  const { user, setUser } = useAuth();
  const { theme } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (user?.avatar) setAvatarUrl(`${API_URL}/uploads/${user.avatar}`);
  }, [user]);

  useEffect(() => {
    if (!user) {
      console.error("Пользователь не авторизован");
      return;
    }
  
    const fetchData = async () => {
      try {
        const teamRes = await fetch(`${API_URL}/api/teams`);
        const allTeams: Team[] = await teamRes.json();
        const userTeams = allTeams.filter((team) =>
          team.members.some((member) => member.email === user.email)
        );
        setTeams(userTeams);
  
        const projectRes = await fetch(`${API_URL}/api/projects`);
        const allProjects: Project[] = await projectRes.json();
        const userTeamIds = userTeams.map((team) => team.ID_Team);
        const userProjects = allProjects.filter((project) =>
          userTeamIds.includes(project.ID_Team)
        );
        setProjects(userProjects);
  
        if (!user.id) {
          console.error("ID пользователя отсутствует");
          return;
        }
  
        const taskRes = await fetch(`${API_URL}/api/tasks/employee/${user.id}`);
        const userTasks: Task[] = await taskRes.json();
        setTasks(userTasks);
      } catch {
        messageApi.error("Ошибка загрузки данных");
      }
    };
  
    fetchData();
  }, [user, messageApi]);
  

  const getInitials = (fullName: string = "") => {
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return `${first}${second}`.toUpperCase();
  };

  const handleAvatarUpload = async (info: UploadChangeParam<UploadFile<RcFile>>) => {
    const file = info.file.originFileObj;
    if (!file || !user?.id) return messageApi.error("Не удалось получить файл или ID пользователя отсутствует");

    const formDataData = new FormData();
    formDataData.append("avatar", file);
    formDataData.append("userId", String(user.id));

    try {
      const response = await fetch(`${API_URL}/api/upload-avatar`, {
        method: "POST",
        body: formDataData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Ошибка при загрузке аватара");
      const data = await response.json();
      setAvatarUrl(`${API_URL}/uploads/${data.filename}`);
      setUser({ ...user, avatar: data.filename });
      messageApi.success("Аватар обновлён");
    } catch {
      messageApi.error("Ошибка при загрузке аватара");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) return messageApi.error("ID пользователя не найден");

    try {
      const response = await fetch(`${API_URL}/api/employees/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const resultText = await response.text();
      console.log("Server response:", resultText);

      if (!response.ok) {
        throw new Error(`Ошибка обновления данных: ${resultText}`);
      }

      const updatedUser = JSON.parse(resultText);
      setUser(updatedUser);
      setIsEditing(false);
      messageApi.success("Данные успешно обновлены");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error);
        messageApi.error(error.message || "Ошибка при сохранении данных");
      } else {
        console.error("Неизвестная ошибка:", error);
        messageApi.error("Неизвестная ошибка при сохранении данных");
      }
    }
  };

  if (!user) return <div className="dashboard">Загрузка...</div>;

  const fullName = `${formData.lastName} ${formData.firstName}`.trim();

  return (
    <App>
      {contextHolder}
      <div className="dashboard">
        <HeaderEmployee />
        <div className="dashboard-body account-page-centered">
          <main className="main-content account-content">
            <div className="account-container">
            <Card
  className="account-card"
  bordered={false}
  title="Профиль сотрудника"
  extra={
    <Button
      type="text"
      icon={isEditing ? <CheckOutlined /> : <EditOutlined />}
      onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
    />
  }
>
  <div className="avatar-wrapper">
    <Avatar
      size={100}
      src={avatarUrl || undefined}
      style={{ backgroundColor: "#444", color: "#fff", fontSize: 32 }}
    >
      {!avatarUrl && getInitials(fullName)}
    </Avatar>
  </div>

  <Upload showUploadList={false} beforeUpload={() => false} onChange={handleAvatarUpload}>
    <label className="upload-label">
      <UploadOutlined /> Загрузить аватар
    </label>
  </Upload>

  {isEditing ? (
    <>
      <Input
        name="lastName"
        placeholder="Фамилия"
        value={formData.lastName}
        onChange={handleChange}
        style={{ marginTop: 16 }}
      />
      <Input
        name="firstName"
        placeholder="Имя"
        value={formData.firstName}
        onChange={handleChange}
        style={{ marginTop: 8 }}
      />
      <Input
        name="phone"
        placeholder="Телефон"
        value={formData.phone}
        onChange={handleChange}
        style={{ marginTop: 8 }}
      />
    </>
  ) : (
    <>
      <Title level={3} className="text-color" style={{ marginTop: 16 }}>
        {fullName}
      </Title>
      <Text className="role-text">{user.role}</Text>
      <Divider />
      <div className="info-item">
        <MailOutlined className="icon" />
        <Text>{user.email}</Text>
      </div>
      <div className="info-item">
        <PhoneOutlined className="icon" />
        <Text>{user.phone || "+7 (999) 999-99-99"}</Text>
      </div>
    </>
  )}
</Card>


              <Card className="account-summary-card" bordered={false}>
                <Divider orientation="left">
                  <Title level={3} className="text-color" style={{ margin: 0 }}>
                    <FileTextOutlined style={{ marginRight: 8 }} />
                    Сводная информация о сотруднике
                  </Title>
                </Divider>

                <Divider orientation="left" style={{ marginTop: 24 }}>
                  <Title level={4} className="text-color" style={{ margin: 0 }}>
                    <TeamOutlined style={{ marginRight: 8 }} /> Участие в командах
                  </Title>
                </Divider>
                {teams.length > 0 ? (
                  teams.map((team) => (
                    <Text key={team.ID_Team} className="text-color" style={{ display: "block" }}>
                      <CheckCircleOutlined style={{ marginRight: 8 }} /> <strong>{team.Team_Name}</strong>
                    </Text>
                  ))
                ) : (
                  <Text type="secondary">Не состоит ни в одной команде.</Text>
                )}

                <Divider orientation="left" style={{ marginTop: 24 }}>
                  <Title level={4} className="text-color" style={{ margin: 0 }}>
                    <ProjectOutlined style={{ marginRight: 8 }} /> Активные проекты
                  </Title>
                </Divider>
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <Text key={project.ID_Order} className="text-color" style={{ display: "block" }}>
                      <RocketOutlined style={{ marginRight: 8 }} /> <strong>{project.Order_Name}</strong>
                    </Text>
                  ))
                ) : (
                  <Text type="secondary">Нет активных проектов.</Text>
                )}

                <Divider orientation="left" style={{ marginTop: 24 }}>
                  <Title level={4} className="text-color" style={{ margin: 0 }}>
                    <PushpinOutlined style={{ marginRight: 8 }} /> Текущие задачи
                  </Title>
                </Divider>
                {tasks.length > 0 ? (
                  tasks.map((task, index) => (
                    <Text key={task.ID_Task} className="text-color" style={{ display: "block" }}>
                      {index + 1}. <EditOutlined style={{ marginRight: 8 }} /> <strong>{task.Task_Name}</strong> — Статус: <em>{task.Status_Name}</em>
                    </Text>
                  ))
                ) : (
                  <Text type="secondary">Нет назначенных задач.</Text>
                )}

                <Divider style={{ marginTop: 24 }} />
                <Text className="text-color">
                  <FileTextOutlined style={{ marginRight: 8 }} />
                  Назначено <strong>{tasks.length}</strong> задач в <strong>{projects.length}</strong> проектах.
                </Text>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </App>
  );
};

export default EmployeeAccount;
