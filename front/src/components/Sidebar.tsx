import React, { useState, useEffect } from "react";
import { Layout, Menu, Avatar } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TableOutlined,
  ProjectOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import "../styles/components/Sidebar.css";

const { Sider } = Layout;
const API_URL = import.meta.env.VITE_API_URL;

interface SidebarProps {
  role: "employee" | "manager";
  onCollapse?: (collapsed: boolean) => void;
}

interface TeamInfo {
  Team_Name: string;
  Team_Icon?: string | null;
  Role?: string;
}
interface TeamMember {
  email: string;
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role, onCollapse }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const { user } = useAuth();

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  const employeeMenuItems = [
    {
      key: "/employee",
      icon: <TableOutlined />,
      label: <Link to="/employee">Доски задач</Link>,
    },
    {
      key: "/teams",
      icon: <TeamOutlined />,
      label: <Link to="/teams">Команды и проекты</Link>,
    },
    {
      key: "/time-tracking",
      icon: <ClockCircleOutlined />,
      label: <Link to="/time-tracking">Учёт времени</Link>,
    },
    {
      key: "/employee-reports",
      icon: <BarChartOutlined />,
      label: <Link to="/employee-reports">Отчёты</Link>,
    },
  ];

  const managerMenuItems = [
    {
      key: "/manager",
      icon: <TableOutlined />,
      label: <Link to="/manager">Главная</Link>,
    },
    {
      key: "/projects",
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Управление проектами</Link>,
    },
    {
      key: "/myteams",
      icon: <TeamOutlined />,
      label: <Link to="/myteams">Мои команды</Link>,
    },
    {
      key: "/team-management",
      icon: <TeamOutlined />,
      label: <Link to="/team-management">Команды</Link>,
    },
    {
      key: "/time-tracking",
      icon: <ProjectOutlined />,
      label: <Link to="/time-tracking">Учёт времени</Link>,
    },
    {
      key: "/manager-reports",
      icon: <BarChartOutlined />,
      label: <Link to="/manager-reports">Мои отчёты</Link>,
    },
  ];

  const menuItems = role === "manager" ? managerMenuItems : employeeMenuItems;

  useEffect(() => {
    if (!user?.email || role !== "employee") return;

    const fetchTeamInfo = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/teams/by-user?email=${encodeURIComponent(user.email)}`
        );

        if (!response.ok) {
          console.error(`Ошибка при получении данных команды: ${response.status} ${response.statusText}`);
          setTeam(null);
          return;
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setTeam({
            Team_Name: data[0].name || "Моя команда",
            Team_Icon: null,
            Role: (data[0].members as TeamMember[])?.find(
              (m) => m.email === user.email
            )?.role || "Неизвестна",
          });
        } else {
          setTeam(null);
        }
      } catch (error) {
        console.error("Ошибка при получении данных команды:", error);
        setTeam(null);
      }
    };

    fetchTeamInfo();
  }, [user, role]);

  useEffect(() => {
    const layout = document.querySelector(".layout");
    if (layout) layout.classList.toggle("collapsed", collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (onCollapse) {
      onCollapse(collapsed);
    }

    // Обновляем класс на body для смещения контента
    if (collapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
  }, [collapsed, onCollapse]);

  const gradientPatternPalette = [
    "linear-gradient(135deg, #1f4037 0%, #dd2476 100%)",
    "linear-gradient(135deg, #ffaf7b 0%, #1d4350 100%)",
    "linear-gradient(135deg, #ffaf7b 0%, #3a1c71 100%)",
    "linear-gradient(135deg, #99f2c8 0%, #45a247 100%)",
    "linear-gradient(135deg, #1d4350 0%, #1d4350 100%)",
    "linear-gradient(135deg, #6a11cb 0%, #d76d77 100%)",
    "linear-gradient(135deg, #1f4037 0%, #004e92 100%)",
    "linear-gradient(135deg, #000428 0%, #1d4350 100%)",
    "linear-gradient(135deg, #1d4350 0%, #41295a 100%)",
    "linear-gradient(135deg, #a43931 0%, #ffaf7b 100%)",
  ];

  const getPatternFromName = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradientPatternPalette[Math.abs(hash) % gradientPatternPalette.length];
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      className="sidebar"
      width={240}
      collapsedWidth={80}
    >
      <div className="sidebar-content" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div>
        <div className="toggle-button-wrapper">
  <div className="toggle-button" onClick={toggleCollapsed}>
    {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
  </div>
</div>

          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
          />
        </div>

        {team && (
          <div style={{ borderTop: "1px solid #333", padding: "12px 16px", marginTop: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Avatar
                size={40}
                style={{
                  borderRadius: "50%",
                  backgroundImage: getPatternFromName(team?.Team_Name || "none"),
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 40,
                  minHeight: 40,
                }}
              >
                {team ? `${team.Team_Name.charAt(0).toUpperCase()}${team.Team_Name.charAt(team.Team_Name.length - 1).toUpperCase()}` : "?"}
              </Avatar>
              {!collapsed && (
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#fff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {team ? team.Team_Name : "Пока не в команде"}
                  </div>
                  {team?.Role && (
                    <div style={{ fontSize: 12, color: "#ccc" }}>
                      Моя роль: {team.Role}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Sider>
  );
};

export default Sidebar;
