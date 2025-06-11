// src/pages/ManagerAccount.tsx

import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Avatar,
  Divider,
  Upload,
  App,
  message,
  Input,
  Button,
  Tabs,
} from "antd";
import {
  MailOutlined,
  PhoneOutlined,
  UploadOutlined,
  FileTextOutlined,
  TeamOutlined,
  ProjectOutlined,
  PushpinOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import { useAuth } from "../contexts/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import HeaderManager from "../components/HeaderManager";
import "../styles/pages/ManagerAccount.css";
import imageCompression from "browser-image-compression";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL;

interface Team {
  ID_Team: number;
  Team_Name: string;
  Status: string;
  members: { email: string }[];
}

interface Project {
  ID_Order: number;
  Order_Name: string;
  ID_Team: number;
  IsArchived?: boolean;
  Deadline?: string | null;
  Status?: string; // ✅ Статус проекта (например, 'В работе')
  ID_Manager?: number | null; // ✅ Менеджер проекта
}

interface Task {
  ID_Task: number;
  Task_Name: string;
  Status_Name: string;
  ID_Order: number;
}

const ManagerAccount: React.FC = () => {
  const { user, setUser } = useAuth();
  const { theme } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  const [expandedTeams, setExpandedTeams] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState(false);

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
    const fetchData = async () => {
      try {
        const [teamRes, projectRes, taskRes] = await Promise.all([
          fetch(`${API_URL}/api/teams`),
          fetch(`${API_URL}/api/projects`),
          fetch(`${API_URL}/api/tasks`),
        ]);

        const responses = [teamRes, projectRes, taskRes];
        const results = await Promise.all(
          responses.map(async (res) => {
            if (!res.ok) throw new Error(`Ошибка загрузки ${res.url}`);
            const contentType = res.headers.get("Content-Type");
            if (contentType && contentType.includes("application/json")) {
              return res.json();
            } else {
              throw new Error(`Некорректный ответ от ${res.url}`);
            }
          })
        );

        const [allTeams, allProjects, allTasks] = results;
        console.log("Teams:", allTeams);
        console.log("Projects:", allProjects);
        console.log("Tasks:", allTasks);

        setTeams(allTeams);
        setProjects(allProjects);
        setTasks(allTasks);
      } catch (error) {
        console.error(error);
        messageApi.error("Ошибка загрузки данных");
      }
    };

    fetchData();
  }, [messageApi]);

  const getInitials = (fullName: string = "") => {
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return `${first}${second}`.toUpperCase();
  };

  const handleAvatarUpload = async (file: RcFile) => {
    if (!file) {
      messageApi.error("Файл не выбран");
      return;
    }

    if (!user?.id) {
      messageApi.error("ID пользователя не найден");
      return;
    }

    try {
      const compressedFile = await imageCompression(file, {
        maxWidthOrHeight: 256,
        useWebWorker: true,
      });

      const formDataData = new FormData();
      formDataData.append("avatar", compressedFile);
      formDataData.append("userId", String(user.id));

      const response = await fetch(`${API_URL}/api/employees/upload-avatar`, {

        method: "POST",
        body: formDataData,
      });

      const result = await response.json().catch(() => null);

      if (response.ok && result?.filename) {
        setAvatarUrl(`${API_URL}/uploads/${result.filename}`);
        setUser({ ...user, avatar: result.filename });
        messageApi.success("Аватар успешно обновлён");
      } else {
        messageApi.error(
          "Аватар обновлён локально, но сервер не дал подтверждения."
        );
      }
    } catch (error: unknown) {
      console.error(error);
      messageApi.error(
        error instanceof Error ? error.message : "Неизвестная ошибка"
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.phone.trim()
    ) {
      return messageApi.error("Все поля должны быть заполнены");
    }

    if (!user?.id) return messageApi.error("ID пользователя не найден");

    try {
      const response = await fetch(`${API_URL}/api/manager/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, ...formData }),
      });

      const result = await response.json().catch(() => null);

      if (response.ok) {
        setUser({ ...user, ...formData });
        setIsEditing(false);
        messageApi.success("Данные успешно обновлены");
      } else {
        messageApi.error(
          result?.message ||
            "Ошибка обновления данных, но изменения применены локально"
        );
      }
    } catch (error: unknown) {
      console.error(error);
      messageApi.error("Ошибка при сохранении данных");
    }
  };

  if (!user) return <div className="dashboard">Загрузка...</div>;

  const fullName = `${formData.lastName} ${formData.firstName}`.trim();

  const activeProjects = projects.filter(
    (project) =>
      project.Status !== "Закрыт" &&
      project.Status !== "Удален" &&
      project.Status !== "Завершён"
  );
  const archivedProjects = projects.filter(
    (project) =>
      project.Status === "Закрыт" ||
      project.Status === "Удален" ||
      project.Status === "Завершён"
  );

  // Определение ID команд для фильтрации команд
  const activeTeamIds = activeProjects.map((p) => p.ID_Team);
  const archivedTeamIds = archivedProjects.map((p) => p.ID_Team);

  const activeTeams = teams.filter((team) =>
    activeTeamIds.includes(team.ID_Team)
  );
  const archivedTeams = teams.filter((team) =>
    archivedTeamIds.includes(team.ID_Team)
  );

  console.log("Все задачи:", tasks);
  console.log("Активные проекты:", activeProjects);
  console.log("Архивные проекты:", archivedProjects);

  const activeTasks = tasks; // Показывать все задачи, пока не проверим данные
  const archivedTasks = tasks; // Показывать все задачи, пока не проверим данные

  const findTeamNameByProject = (teamId: number): string => {
    const team = teams.find((t) => t.ID_Team === teamId);
    return team ? team.Team_Name : "Неизвестная команда";
  };

  return (
    <App>
      {contextHolder}
      <div className="dashboard">
        <HeaderManager />
        <div
          style={{
            position: "absolute",
            top: "80px",
            left: "24px",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            zIndex: 1000,
          }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeftOutlined
            style={{
              fontSize: "20px",
              marginRight: "8px",
              color: "var(--accent-color)",
            }}
          />
          <Text style={{ fontSize: "16px", color: "var(--text-color)" }}>
            Назад
          </Text>
        </div>

        <div className="dashboard-body account-page-centered">
          <main className="main-content account-content">
            <div className="account-container">
              <Card
                className="account-card"
                variant="borderless"
                title={
                  <div className="account-card-header">
                    <span className="account-card-title">
                      Профиль менеджера
                    </span>
                    <div className="account-card-actions">
                      {isEditing ? (
                        <>
                          <Button
                            type="text"
                            icon={<CheckOutlined />}
                            onClick={handleSave}
                            style={{ marginRight: 8 }}
                          />
                          <Button
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={() => {
                              setFormData({
                                firstName: user?.firstName || "",
                                lastName: user?.lastName || "",
                                phone: user?.phone || "",
                              });
                              setIsEditing(false);
                            }}
                          />
                        </>
                      ) : (
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => setIsEditing(true)}
                        />
                      )}
                    </div>
                  </div>
                }
              >
                <div className="avatar-wrapper">
                  <Avatar
                    size={100}
                    src={avatarUrl ? avatarUrl : undefined}
                    style={{
                      backgroundColor: "#444",
                      color: "#fff",
                      fontSize: 32,
                      overflow: "hidden",
                    }}
                  >
                    {!avatarUrl && getInitials(fullName)}
                  </Avatar>
                </div>

                <Upload
                  showUploadList={false}
                  accept="image/*"
                  beforeUpload={(file) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      if (e.target?.result) {
                        setAvatarUrl(e.target.result as string);
                        handleAvatarUpload(file as RcFile).catch((error) => {
                          console.error(error);
                          messageApi.error(
                            "Ошибка при загрузке на сервер, но предпросмотр сохранён."
                          );
                        });
                      }
                    };
                    reader.readAsDataURL(file);
                    return false;
                  }}
                >
                  <label className="upload-label">
                    <UploadOutlined /> Сменить фото
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
                    <PhoneInput
                      country={"by"}
                      value={formData.phone}
                      onChange={(phone) =>
                        setFormData((prev) => ({ ...prev, phone }))
                      }
                      enableSearch
                      onlyCountries={[
                        "ru",
                        "by",
                        "kz",
                        "ua",
                        "kg",
                        "md",
                        "tj",
                        "tm",
                        "uz",
                        "az",
                        "am",
                      ]}
                      inputProps={{
                        name: "phone",
                        required: true,
                        autoComplete: "off",
                        style: {
                          width: "100%",
                          marginTop: 8,
                          padding: "4px 11px 4px 48px",
                          borderRadius: "6px",
                          border: `1px solid ${
                            theme === "dark" ? "#434343" : "#d9d9d9"
                          }`,
                          backgroundColor:
                            theme === "dark" ? "#1f1f1f" : "#fff",
                          color: theme === "dark" ? "#fff" : "#000",
                        },
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Title level={3} style={{ marginTop: 16 }}>
                      {fullName}
                    </Title>
                    <Text>{user.role}</Text>
                    <Divider />
                    <div className="info-item">
                      <MailOutlined style={{ marginRight: 8 }} />
                      <Text>{user.email}</Text>
                    </div>
                    <div className="info-item">
                      <PhoneOutlined style={{ marginRight: 8 }} />
                      <Text>{user.phone || "+7 (999) 999-99-99"}</Text>
                    </div>
                  </>
                )}
              </Card>

              <Tabs
                defaultActiveKey="current"
                tabBarStyle={{ margin: 0, padding: 0, borderBottom: "none" }}
                style={{
                  margin: 0,
                  padding: 0,
                  borderRadius: 0,
                  overflow: "hidden",
                }}
              >
                <Tabs.TabPane tab="Текущая информация" key="current">
                  {renderSummary(
                    activeTeams,
                    activeProjects,
                    activeTasks,
                    "Текущая статистика всех сотрудников",
                    expandedTeams,
                    setExpandedTeams,
                    expandedProjects,
                    setExpandedProjects,
                    expandedTasks,
                    setExpandedTasks
                  )}
                </Tabs.TabPane>
                <Tabs.TabPane tab="Архив" key="archive">
                  {renderSummary(
                    archivedTeams,
                    archivedProjects,
                    archivedTasks,
                    "Архивная статистика всех сотрудников",
                    expandedTeams,
                    setExpandedTeams,
                    expandedProjects,
                    setExpandedProjects,
                    expandedTasks,
                    setExpandedTasks
                  )}
                </Tabs.TabPane>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </App>
  );

  function renderSummary(
    displayTeams: Team[],
    displayProjects: Project[],
    displayTasks: Task[],
    title: string,
    expandedTeams: boolean,
    setExpandedTeams: React.Dispatch<React.SetStateAction<boolean>>,
    expandedProjects: boolean,
    setExpandedProjects: React.Dispatch<React.SetStateAction<boolean>>,
    expandedTasks: boolean,
    setExpandedTasks: React.Dispatch<React.SetStateAction<boolean>>
  ) {
    return (
      <Card
        className="account-summary-card"
        variant="borderless"
        style={{
          margin: 0,
          padding: 0,
          border: "none",
          boxShadow: "none",
          borderRadius: 0,
        }}
        bodyStyle={{
          padding: 24,
        }}
      >
        <Divider orientation="left" style={{ marginTop: 0, marginBottom: 0 }}>
          <Title level={3} style={{ margin: 0 }}>
            {title}
          </Title>
        </Divider>

        <Divider orientation="left" style={{ marginTop: 24 }}>
          <Title level={4} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 8 }} /> Участие в командах
          </Title>
        </Divider>
        {displayTeams.length > 0 ? (
          <>
            {(expandedTeams ? displayTeams : displayTeams.slice(0, 10)).map(
              (team, index) => (
                <Text
                  key={team.ID_Team}
                  style={{ display: "block", marginLeft: 24 }}
                >
                  {index + 1}. {team.Team_Name}
                </Text>
              )
            )}
            {displayTeams.length > 10 && (
              <Button
                type="link"
                onClick={() => setExpandedTeams(!expandedTeams)}
                style={{ marginTop: 8 }}
              >
                {expandedTeams
                  ? "Скрыть"
                  : `Показать ещё (${displayTeams.length - 10})`}
              </Button>
            )}
          </>
        ) : (
          <Text type="secondary">Нет данных о командах.</Text>
        )}

        <Divider orientation="left" style={{ marginTop: 24 }}>
          <Title level={4} style={{ margin: 0 }}>
            <ProjectOutlined style={{ marginRight: 8 }} /> Проекты
          </Title>
        </Divider>
        {displayProjects.length > 0 ? (
          <>
            {(expandedProjects
              ? displayProjects
              : displayProjects.slice(0, 10)
            ).map((project, index) => (
              <Text
                key={project.ID_Order}
                style={{ display: "block", marginLeft: 24 }}
              >
                {index + 1}. {project.Order_Name} (
                {findTeamNameByProject(project.ID_Team)})
              </Text>
            ))}
            {displayProjects.length > 10 && (
              <Button
                type="link"
                onClick={() => setExpandedProjects(!expandedProjects)}
                style={{ marginTop: 8 }}
              >
                {expandedProjects
                  ? "Скрыть"
                  : `Показать ещё (${displayProjects.length - 10})`}
              </Button>
            )}
          </>
        ) : (
          <Text type="secondary">Нет данных о проектах.</Text>
        )}
        <Divider orientation="left" style={{ marginTop: 24 }}>
          <Title level={4} style={{ margin: 0 }}>
            <PushpinOutlined style={{ marginRight: 8 }} /> Задачи
          </Title>
        </Divider>
        {displayTasks.length > 0 ? (
          <>
            {(expandedTasks ? displayTasks : displayTasks.slice(0, 10)).map(
              (task, index) => (
                <Text
                  key={task.ID_Task}
                  style={{ display: "block", marginLeft: 24 }}
                >
                  {index + 1}. {task.Task_Name} — Статус:{" "}
                  <em>{task.Status_Name}</em>
                </Text>
              )
            )}
            {displayTasks.length > 10 && (
              <Button
                type="link"
                onClick={() => setExpandedTasks(!expandedTasks)}
                style={{ marginTop: 8 }}
              >
                {expandedTasks
                  ? "Скрыть"
                  : `Показать ещё (${displayTasks.length - 10})`}
              </Button>
            )}
          </>
        ) : (
          <Text type="secondary">Нет данных о задачах.</Text>
        )}

        <Divider style={{ marginTop: 24 }} />
        <Text>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Назначено <strong>{displayTasks.length}</strong> задач в{" "}
          <strong>{displayProjects.length}</strong> проектах.
        </Text>
      </Card>
    );
  }
};

export default ManagerAccount;
