import React, { useEffect, useState } from "react";

import {
  Table,
  ConfigProvider,
  theme,
  message,
  Tabs,
  Button,
  Dropdown,
  Avatar,
  Tooltip,
} from "antd";

import { DownloadOutlined } from "@ant-design/icons";
import Header from "../components/HeaderEmployee";
import Sidebar from "../components/Sidebar";
import "../styles/pages/TeamManagementPage.css";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface TeamMember {
  ID_User: number;
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
}

interface Team {
  ID_Team: number;
  Team_Name: string;
  members: TeamMember[];
}

interface Project {
  ID_Order: number;
  Order_Name: string;
  Type_Name: string;
  Creation_Date: string;
  End_Date: string;
  Status: string;
  Team_Name?: string;
}
interface CurrentUser {
  ID_User: number;
  email: string;
}
const MyCommandsEmployee: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [messageApi, contextHolder] = message.useMessage() as [
    ReturnType<typeof message.useMessage>[0],
    React.ReactElement
  ];

  const [activeTab, setActiveTab] = useState<string>("teams");

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.ID_User) {
        const fetchProfile = async () => {
          try {
            const res = await fetch(`${API_URL}/api/employees/${user.ID_User}`);
            if (!res.ok) throw new Error("Ошибка при загрузке профиля");

            const profile = await res.json();
            setCurrentUser(profile);
          } catch (error) {
            console.error("Ошибка при загрузке профиля:", error);
            messageApi.error("Ошибка при загрузке профиля");
          }
        };

        fetchProfile();
      }
    }
  }, [messageApi]);

  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(" ");
    const initials = names.map((name) => name.charAt(0).toUpperCase());
    return initials.slice(0, 2).join("");
  };

  useEffect(() => {
    if (currentUser) {
      const fetchTeamsAndProjects = async () => {
        try {
          const resTeams = await fetch(`${API_URL}/api/teams`);
          const resProjects = await fetch(`${API_URL}/api/projects`);
          if (!resTeams.ok || !resProjects.ok) throw new Error();

          const allTeams: Team[] = await resTeams.json();
          const allProjects: Project[] = await resProjects.json();
          const userEmail = currentUser.email;

          const userTeams = allTeams.filter((team) =>
            team.members.some((member) => member.email === userEmail)
          );
          const userTeamNames = userTeams.map((t) => t.Team_Name);
          const userProjects = allProjects.filter((p) =>
            userTeamNames.includes(p.Team_Name || "")
          );

          setTeams(userTeams);
          setProjects(userProjects);
        } catch {
          messageApi.error("Ошибка при загрузке данных");
        }
      };

      fetchTeamsAndProjects();
    }
  }, [currentUser, messageApi]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  
  const exportHandler = async (
    type: "teams" | "projects",
    format: "xlsx" | "pdf" | "docx"
  ) => {
    try {
      const endpoint = type === "teams" ? "teams" : "projects";
      const dataToSend = type === "teams" ? teams : projects;
  
      const res = await fetch(`${API_URL}/api/export/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: format === "xlsx" ? "excel" : format,
          ...(type === "projects"
            ? { projects: dataToSend, userId: currentUser?.ID_User }
            : { teams: dataToSend }),
        }),
           
      });
      
      if (!res.ok) throw new Error("Ошибка при экспорте отчётов");
  
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${endpoint}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Ошибка при экспорте:", error);
      messageApi.error("Ошибка экспорта данных");
    }
  };
  

  const teamColumns: ColumnsType<Team> = [
    {
      title: <div style={{ textAlign: "center" }}>Название команды</div>,
      dataIndex: "Team_Name",
      key: "Team_Name",
      align: "center",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Роль участника</div>,
      key: "members",
      align: "center",
      render: (_: unknown, team: Team) =>
        team.members.map((m, index) => (
          <div
            key={`${m.ID_User}-${index}`}
            style={{ textAlign: "left", marginBottom: 6 }}
          >
            {m.fullName} ({m.role}) — {m.email}
          </div>
        )),
    },
  ];

  const projectColumns: ColumnsType<Project> = [
    {
      title: <div style={{ textAlign: "center" }}>Название проекта</div>,
      dataIndex: "Order_Name",
      key: "Order_Name",
      align: "center",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Тип проекта</div>,
      dataIndex: "Type_Name",
      key: "Type_Name",
      align: "center",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Дата создания</div>,
      dataIndex: "Creation_Date",
      key: "Creation_Date",
      align: "center",
      render: (date: string) => (
        <div style={{ textAlign: "left" }}>
          {dayjs(date).format("YYYY-MM-DD")}
        </div>
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>Дата окончания</div>,
      dataIndex: "End_Date",
      key: "End_Date",
      align: "center",
      render: (date: string | null) => (
        <div style={{ textAlign: "left" }}>
          {date ? dayjs(date).format("YYYY-MM-DD") : ""}
        </div>
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>Статус</div>,
      dataIndex: "Status",
      key: "Status",
      align: "center",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
    },
    {
      title: <div style={{ textAlign: "center" }}>Команда</div>,
      dataIndex: "Team_Name",
      key: "Team_Name",
      align: "center",
      render: (text: string | undefined) => (
        <div style={{ textAlign: "left" }}>{text || "Без команды"}</div>
      ),
    },
  ];

  const renderExportMenu = (type: "teams" | "projects") => (
    <Dropdown
      menu={{
        items: [
          {
            key: "docx",
            label: "Экспорт в Word (.docx)",
            onClick: () => exportHandler(type, "docx"),
          },
          {
            key: "xlsx",
            label: "Экспорт в Excel (.xlsx)",
            onClick: () => exportHandler(type, "xlsx"),
          },
          {
            key: "pdf",
            label: "Экспорт в PDF (.pdf)",
            onClick: () => exportHandler(type, "pdf"),
          },
        ],
      }}
    >
      <Button icon={<DownloadOutlined />}>Экспорт</Button>
    </Dropdown>
  );

  const membersWithMissingId = teams
    .flatMap((team: Team) => team.members)
    .filter((member: TeamMember) => !member.ID_User);

  console.log("Members with missing ID:", membersWithMissingId);
  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      {contextHolder}
      <div className="dashboard">
        <Header />
        <div className="dashboard-body">
          <Sidebar role="employee" />
          <main className="main-content">
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 600,
                marginBottom: "24px",
              }}
            >
              Моя команда и мои проекты
            </h1>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              items={[
                {
                  key: "teams",
                  label: "Мои команды",
                  children: (
                    <>
                      <div
                        style={{
                          marginBottom: 16,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          {Array.from(
                            new Map(
                              teams
                                .flatMap((team: Team) => team.members)
                                .map((member: TeamMember) => [
                                  member.ID_User ?? member.email,
                                  member,
                                ])
                            ).values()
                          ).map((member: TeamMember, index: number) => (
                            <Tooltip
                              key={member.ID_User ?? member.email}
                              title={member.fullName}
                            >
                              <Avatar
                                src={
                                  member.avatar && member.avatar !== "null"
                                    ? `${API_URL}/uploads/${encodeURIComponent(
                                        member.avatar
                                      )}`
                                    : undefined
                                }
                                size={40}
                                style={{
                                  backgroundColor:
                                    !member.avatar || member.avatar === "null"
                                      ? "#777"
                                      : "transparent",
                                  cursor: "pointer",
                                  marginLeft: index === 0 ? 0 : -10,
                                  zIndex: 100 - index,
                                  border: "2px solid #1f1f1f",
                                  boxShadow: "0 0 3px rgba(0,0,0,0.2)",
                                }}
                                onClick={() => {
                                  const id = Number(member.ID_User);

                                  if (!id || isNaN(id)) {
                                    console.warn(
                                      "Некорректный ID сотрудника:",
                                      member
                                    );
                                    messageApi.warning(
                                      "Некорректный ID сотрудника, переход невозможен"
                                    );
                                    return;
                                  }

                                  if (id === Number(currentUser?.ID_User)) {
                                    navigate("/profile");
                                  } else {
                                    navigate(`/employee/${id}`);
                                  }
                                }}
                              >
                                {!member.avatar || member.avatar === "null"
                                  ? getInitials(member.fullName)
                                  : null}
                              </Avatar>
                            </Tooltip>
                          ))}
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          {renderExportMenu("teams")}
                        </div>
                      </div>

                      <Table
                        dataSource={teams}
                        columns={teamColumns}
                        rowKey="ID_Team"
                        pagination={false}
                      />
                    </>
                  ),
                },
                {
                  key: "projects",
                  label: "Мои проекты",
                  children: (
                    <>
                      <div
                        style={{
                          marginBottom: 16,
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                        }}
                      >
                        {renderExportMenu("projects")}
                      </div>

                      <Table
                        dataSource={projects}
                        columns={projectColumns}
                        rowKey="ID_Order"
                        pagination={false}
                      />
                    </>
                  ),
                },
              ]}
            />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default MyCommandsEmployee;