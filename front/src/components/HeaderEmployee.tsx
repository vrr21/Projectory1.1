import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Layout,
  Badge,
  Avatar,
  Dropdown,
  Modal,
  Tooltip,
  Drawer,
  List,
  MenuProps,
} from "antd";
import { BellOutlined, BulbOutlined } from "@ant-design/icons";
import { CloseOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/components/Header.css";
import logoDark from "../assets/лого.png";
import logoLight from "../assets/лого2.png";

const { Header } = Layout;
const API_URL = import.meta.env.VITE_API_URL;

interface NotificationItem {
  id: number;
  title: string;
  description: string;
  Created_At: string;
  datetime?: string;
  isRead?: boolean;
  link?: string;
}

const HeaderEmployee: React.FC = () => {
  const { user, setUser } = useAuth();

  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const shownModalsRef = useRef<Set<number>>(new Set());

  const profileMenu: MenuProps = {
    items: [
      {
        key: "1",
        label: <span onClick={() => navigate("/profile")}>Профиль</span>,
      },
      {
        key: "2",
        label: <span onClick={() => setIsModalVisible(true)}>Выйти</span>,
      },
    ],
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  const handleDrawerOpen = async () => {
    setIsDrawerVisible(true);
    for (const notif of notifications) {
      if (!notif.isRead) {
        await markAsRead(notif.id);
      }
    }
    setUnreadCount(0);
    localStorage.setItem("notificationsReadEmployee", "true");
  };

  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/employee/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Ошибка при отметке уведомления как прочитанного:", err);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Ошибка при удалении уведомления");
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
      toast.success("Уведомление удалено");
    } catch (error) {
      console.error("Ошибка при загрузке уведомлений:", error);
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/notifications/employee/notifications?employeeEmail=${currentUser.email}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Ошибка при загрузке уведомлений");
      const data: NotificationItem[] = await res.json();
      setNotifications(
        data.map((n) => ({
          ...n,
          datetime: new Date(n.Created_At).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          link: n.link && n.link.trim() !== "" ? n.link : `/tasks/${n.id}`,
        }))
      );

      // 🟢 Подсчет непрочитанных
      const unread = data.filter((n) => !n.isRead).length;
      setUnreadCount(unread);

      const modalAlreadyShown = localStorage.getItem("notificationsModalShown");
      if (!modalAlreadyShown && !location.pathname.includes("/notifications")) {
        localStorage.setItem("notificationsModalShown", "true");
        data.forEach((notif) => {
          if (!shownModalsRef.current.has(notif.id)) {
            shownModalsRef.current.add(notif.id);
            toast.info(
              () => (
                <div
                  style={{ cursor: "pointer", padding: "4px 8px" }}
                  onClick={() => {
                    toast.dismiss(`notif-modal-${notif.id}`);
                    navigate("/notifications");
                  }}
                >
                  <strong>{notif.title}</strong>
                  <div style={{ fontSize: "13px" }}>{notif.description}</div>
                </div>
              ),
              {
                toastId: `notif-modal-${notif.id}`,
                autoClose: 7000,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                style: {
                  backgroundColor: theme === "dark" ? "#2c2c2c" : "#ffffff",
                  color: theme === "dark" ? "#ffffff" : "#000000",
                  border: `1px solid var(--border-color)`,
                  borderLeft: `4px solid var(--accent-color)`,
                },
              }
            );
          }
        });
      }
    } catch (error) {
      console.error("Ошибка при загрузке уведомлений:", error);
    }
  }, [theme, navigate, location.pathname]);

  useEffect(() => {
    fetchNotifications();
    window.addEventListener("notificationRefresh", fetchNotifications);
    return () =>
      window.removeEventListener("notificationRefresh", fetchNotifications);
  }, [fetchNotifications]);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    const first = parts[1]?.[0] || ""; // было parts[0]
    const last = parts[0]?.[0] || ""; // было parts[1]
    return `${first}${last}`.toUpperCase();
  };

  return (
    <>
      <Header className="header">
        <div
          className="logo"
          onClick={() => navigate("/employee")}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--text-color)",
          }}
        >
          <img
            src={theme === "dark" ? logoDark : logoLight}
            alt="Logo"
            style={{ height: "1.6em" }}
          />
          Projectory
        </div>

        <div className="right-section">
          <Badge count={unreadCount} className="icon">
            <BellOutlined
              style={{
                fontSize: "20px",
                color: "var(--text-color)",
                cursor: "pointer",
              }}
              onClick={handleDrawerOpen}
            />
          </Badge>

          <Tooltip title="Переключить тему">
            <BulbOutlined
              style={{
                fontSize: "24px",
                color: theme === "dark" ? "#00bcd4" : "#555",
                transform: theme === "dark" ? "rotate(0deg)" : "rotate(180deg)",
                marginLeft: "16px",
                cursor: "pointer",
                transition: "transform 0.4s ease, color 0.4s ease",
              }}
              onClick={toggleTheme}
            />
          </Tooltip>

          <Tooltip title={`${user?.lastName || ""} ${user?.firstName || ""}`}>
            <Dropdown
              menu={profileMenu}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Avatar
                src={
                  user?.avatar ? `${API_URL}/uploads/${user.avatar}` : undefined
                }
                style={{
                  backgroundColor: "#555",
                  marginLeft: "16px",
                  cursor: "pointer",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                {!user?.avatar &&
                  getInitials(`${user?.lastName} ${user?.firstName}`)}
              </Avatar>
            </Dropdown>
          </Tooltip>
        </div>
      </Header>

      <Modal
        title="Подтверждение"
        open={isModalVisible}
        onOk={handleConfirmLogout}
        onCancel={() => setIsModalVisible(false)}
        okText="Да"
        cancelText="Отмена"
        className="confirm-logout-modal"
      >
        <p>Вы действительно хотите выйти из аккаунта?</p>
      </Modal>

      <Drawer
        title="Уведомления"
        placement="right"
        onClose={() => setIsDrawerVisible(false)}
        open={isDrawerVisible}
        width={350}
        className="confirm-logout-modal"
      >
        <List
          itemLayout="vertical"
          dataSource={notifications}
          style={{ marginTop: 0, paddingTop: 0 }}
          renderItem={(item) => (
            <List.Item
              className={`notification-item ${item.link ? "clickable" : ""}`}
              key={item.id}
              onClick={() => {
                if (item.link) {
                  setIsDrawerVisible(false);

                  const [routePart] = item.link.split("#");
                  const isTaskLink = routePart.includes("/tasks/");
                  const isExecutionLink = routePart.includes("/executions/");

                  if (isTaskLink) {
                    navigate("/employee");
                  } else if (isExecutionLink) {
                    navigate("/time-tracking");
                  } else {
                    navigate(
                      routePart.startsWith("/") ? routePart : `/${routePart}`
                    );
                  }

                  const hash = item.link.split("#")[1];
                  if (hash) {
                    setTimeout(() => {
                      const target = document.getElementById(hash);
                      if (target) {
                        target.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }
                    }, 500);
                  }
                }
              }}
            >
              <div className="notification-content">
                <div className="notification-header">
                  <div className="notification-title">{item.title}</div>
                  <CloseOutlined
                    className="notification-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(item.id);
                    }}
                  />
                </div>
                <div className="notification-description">
                  {item.description}
                </div>
                <div className="notification-time">{item.datetime}</div>
              </div>
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
};

export default HeaderEmployee;
