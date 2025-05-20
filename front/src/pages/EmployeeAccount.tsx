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
  CheckCircleOutlined,
  RocketOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import { useAuth } from "../contexts/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import HeaderEmployee from "../components/HeaderEmployee";
import "../styles/pages/EmployeeAccount.css";
import imageCompression from "browser-image-compression";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const API_URL = import.meta.env.VITE_API_URL;

interface Team {
  ID_Team: number;
  Team_Name: string;
  Status: string; // ✅ добавлено свойство Status
  members: { email: string }[];
}

interface Project {
  ID_Order: number;
  Order_Name: string;
  ID_Team: number;
  Status: string;
}

interface Task {
  ID_Task: number;
  Task_Name: string;
  Status_Name: string;
  ID_Order: number; // ✅ Добавлено для связи с проектом
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
    if (!user) return;

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

        const taskRes = await fetch(`${API_URL}/api/tasks/employee/${user.id}`);
        const userTasks: Task[] = await taskRes.json();
        setTasks(userTasks);

        console.log("Загруженные задачи:", userTasks);
        console.log("Активные проекты:", userProjects);

        const computedActiveTasks = userTasks.filter((task) =>
          userProjects.some((project) => project.ID_Order === task.ID_Order)
        );

        console.log("Активные задачи после фильтрации:", computedActiveTasks);
      } catch (error) {
        console.error(error);
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

      if (!response.ok) {
        throw new Error("Ошибка при загрузке аватара");
      }

      const data: { filename: string } = await response.json();
      setAvatarUrl(`${API_URL}/uploads/${data.filename}`);
      setUser({ ...user, avatar: data.filename });
      messageApi.success("Аватар успешно обновлён");
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
      const response = await fetch(`${API_URL}/api/employees/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, ...formData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Ошибка обновления данных");
      }

      setUser({ ...user, ...formData });
      setIsEditing(false);
      messageApi.success("Данные успешно обновлены");
    } catch (error: unknown) {
      console.error(error);
      messageApi.error("Ошибка при сохранении данных");
    }
  };

  if (!user) return <div className="dashboard">Загрузка...</div>;

  const fullName = `${formData.lastName} ${formData.firstName}`.trim();
  // Фильтрация команд
  const activeTeams = teams.filter(
    (team) => team.Status !== "Закрыт" && team.Status !== "Удален"
  );
  const archivedTeams = teams.filter(
    (team) => team.Status === "Закрыт" || team.Status === "Удален"
  );

  // Фильтрация проектов
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

  // Фильтрация задач по активным проектам
  const activeTasks = tasks.filter((task) =>
    activeProjects.some((project) => project.ID_Order === task.ID_Order)
  );

  // Фильтрация задач по архивным проектам
  const archivedTasks = tasks.filter((task) =>
    archivedProjects.some((project) => project.ID_Order === task.ID_Order)
  );

  const findTeamNameByProject = (teamId: number): string => {
    const team = teams.find((t) => t.ID_Team === teamId);
    return team ? team.Team_Name : "Неизвестная команда";
  };

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
                variant="borderless"
                title={
                  <div className="account-card-header">
                    <span className="account-card-title">
                      Профиль сотрудника
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
                          padding: "4px 11px 4px 48px",
                          borderRadius: "6px",
                          border: `1px solid ${
                            theme === "dark" ? "#434343" : "#d9d9d9"
                          }`,
                          backgroundColor:
                            theme === "dark" ? "#1f1f1f" : "#fff",
                          color: theme === "dark" ? "#fff" : "#000",
                          marginTop: 8,
                        },
                      }}
                      buttonStyle={{
                        backgroundColor: theme === "dark" ? "#1f1f1f" : "#fff",
                        borderRight: `1px solid ${
                          theme === "dark" ? "#434343" : "#d9d9d9"
                        }`,
                      }}
                      dropdownStyle={{
                        backgroundColor: theme === "dark" ? "#1f1f1f" : "#fff",
                        color: theme === "dark" ? "#fff" : "#000",
                        border: `1px solid ${
                          theme === "dark" ? "#434343" : "#d9d9d9"
                        }`,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      }}
                      searchStyle={{
                        backgroundColor: theme === "dark" ? "#1f1f1f" : "#fff",
                        color: theme === "dark" ? "#fff" : "#000",
                        border: `1px solid ${
                          theme === "dark" ? "#434343" : "#d9d9d9"
                        }`,
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Title
                      level={3}
                      className="text-color"
                      style={{ marginTop: 16 }}
                    >
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
              <div style={{ margin: 0, padding: 0 }}>
                <Tabs
                  defaultActiveKey="current"
                  tabBarStyle={{
                    margin: 0,
                    padding: 0,
                    borderBottom: "none",
                  }}
                  style={{
                    margin: 0,
                    padding: 0,
                    borderRadius: 0, // ✅ Убирает скругления у Tabs
                    overflow: "hidden", // ✅ Устраняет переполнение закруглениями внутри
                  }}
                >
                  <TabPane tab="Текущая информация" key="current">
                    {renderSummary(teams, projects, tasks, "Моя статистика")}
                  </TabPane>
                  <TabPane tab="Архив" key="archive">
                    {renderSummary(
                      archivedTeams,
                      archivedProjects,
                      archivedTasks,
                      "Архивная статистика"
                    )}
                  </TabPane>
                </Tabs>
              </div>

              {/* Принудительное использование переменных */}
              <div style={{ display: "none" }}>
                {renderSummary(activeTeams, activeProjects, activeTasks)}
              </div>
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
    title: string = "Сводная информация о сотруднике",
    tightLayout = false
  ) {
    return (
      <Card
        className="account-summary-card"
        variant="borderless"
        style={{
          margin: 0,
          padding: tightLayout ? 0 : undefined,
          border: "none",
          boxShadow: "none",
          borderRadius: 0, // Убирает скругления со всех сторон
        }}
        bodyStyle={{
          padding: tightLayout ? 0 : 24,
        }}
      >
        <Divider orientation="left">
          <Title level={3} className="text-color" style={{ margin: 0 }}>
            {title}
          </Title>
        </Divider>

        <Divider orientation="left" style={{ marginTop: 24 }}>
          <Title level={4} className="text-color" style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 8 }} /> Участие в командах
          </Title>
        </Divider>
        {displayTeams.length > 0 ? (
          displayTeams.map((team) => (
            <Text
              key={team.ID_Team}
              className="text-color"
              style={{ display: "block" }}
            >
              <CheckCircleOutlined style={{ marginRight: 8 }} />{" "}
              <strong>{team.Team_Name}</strong>
            </Text>
          ))
        ) : (
          <Text type="secondary">Нет данных о командах.</Text>
        )}

        <Divider orientation="left" style={{ marginTop: 24 }}>
          <Title level={4} className="text-color" style={{ margin: 0 }}>
            <ProjectOutlined style={{ marginRight: 8 }} /> Проекты
          </Title>
        </Divider>
        {displayProjects.length > 0 ? (
          displayProjects.map((project) => (
            <Text
              key={project.ID_Order}
              className="text-color"
              style={{ display: "block" }}
            >
              <RocketOutlined style={{ marginRight: 8 }} />{" "}
              <strong>{project.Order_Name}</strong> (
              {findTeamNameByProject(project.ID_Team)})
            </Text>
          ))
        ) : (
          <Text type="secondary">Нет данных о проектах.</Text>
        )}

        <Divider orientation="left" style={{ marginTop: 24 }}>
          <Title level={4} className="text-color" style={{ margin: 0 }}>
            <PushpinOutlined style={{ marginRight: 8 }} /> Задачи
          </Title>
        </Divider>
        {displayTasks.length > 0 ? (
          displayTasks.map((task, index) => (
            <Text
              key={task.ID_Task}
              className="text-color"
              style={{ display: "block" }}
            >
              {index + 1}. <EditOutlined style={{ marginRight: 8 }} />{" "}
              <strong>{task.Task_Name}</strong> — Статус:{" "}
              <em>{task.Status_Name}</em>
            </Text>
          ))
        ) : (
          <Text type="secondary">Нет данных о задачах.</Text>
        )}

        <Divider style={{ marginTop: 24 }} />
        <Text className="text-color">
          <FileTextOutlined style={{ marginRight: 8 }} />
          Назначено <strong>{displayTasks.length}</strong> задач в{" "}
          <strong>{displayProjects.length}</strong> проектах.
        </Text>
      </Card>
    );
  }
};

export default EmployeeAccount;
