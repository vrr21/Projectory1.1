import React, { useState, useEffect } from "react";
import { Layout, Menu } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TableOutlined,
  ProjectOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";
import "../styles/components/Sidebar.css";
import logo from "../assets/лого.png"; // 🔧 путь к логотипу проекта

const { Sider } = Layout;

const SidebarManager: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const menuItems = [
    {
      key: "/manager",
      icon: <TableOutlined />,
      label: <Link to="/manager">Доска задач</Link>,
    },
    {
      key: "/projects",
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Управление проектами</Link>,
    },
    {
      key: "/manager-time-tracking",
      icon: <ClockCircleOutlined />,
      label: <Link to="/manager-time-tracking">Учёт времени</Link>,
    },
    {
      key: "teams",
      icon: <TeamOutlined style={{ fontSize: "20px" }} />,
      label: "Команды",
      children: [
        {
          key: "/team-management",
          label: (
            <span style={{ fontSize: "13px" }}>
              <Link to="/team-management">Все команды</Link>
            </span>
          ),
        },
        {
          key: "/myteams",
          label: (
            <span style={{ fontSize: "13px" }}>
              <Link to="/myteams">Моя команда</Link>
            </span>
          ),
        },
      ],
    },
    {
      key: "/employee-management",
      icon: <UserAddOutlined />,
      label: <Link to="/employee-management">Список сотрудников</Link>,
    },
    {
      key: "/manager-reports",
      icon: <BarChartOutlined />,
      label: <Link to="/manager-reports">Отчёты</Link>,
    },
  ];

  const getOpenKeys = () => {
    if (
      location.pathname.startsWith("/team-management") ||
      location.pathname.startsWith("/myteams")
    ) {
      return ["teams"];
    }
    return [];
  };

  useEffect(() => {
    const layout = document.querySelector(".layout");
    if (layout) {
      layout.classList.toggle("collapsed", collapsed);
    }

    if (collapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
  }, [collapsed]);

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      className="sidebar"
      width={240}
      collapsedWidth={80}
    >
      <div
        className="sidebar-content"
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
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
            defaultOpenKeys={getOpenKeys()}
            items={menuItems}
          />
        </div>

        <div
          style={{
            borderTop: "1px solid #333",
            padding: "12px 16px",
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundImage:
                  "linear-gradient(135deg, #1f4037 0%, #004e92 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img
                src={logo}
                alt="Project Logo"
                style={{
                  width: 24,
                  height: 24,
                  objectFit: "contain",
                  borderRadius: "50%",
                }}
              />
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div
                  className="team-name"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                 Администрирование
                </div>
                <div className="team-role" style={{ fontSize: 12 }}>
                  Менеджер Projectory
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Sider>
  );
};

export default SidebarManager;
