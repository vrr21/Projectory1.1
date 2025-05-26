import React, { useEffect, useState, useCallback } from "react";
import {
  ConfigProvider,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Avatar,
  Dropdown,
} from "antd";
import {
  UserAddOutlined,
  EditOutlined,
  InboxOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import SidebarManager from "../components/SidebarManager";
import HeaderManager from "../components/HeaderManager";
import "../styles/pages/ManagerDashboard.css";
import { theme } from "antd";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface User {
  ID_User: number;
  First_Name: string;
  Last_Name: string;
  Email: string;
  Phone: string;
  Password?: string;
  Avatar?: string;
  Roles?: string;
  Teams?: string;
  Projects?: string;
  Tasks?: string;
  Archived?: boolean;
}

const isNumericOrDateOrDash = (value: string | number | undefined): boolean => {
  if (typeof value === "number") return true;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return (
      trimmed === "-" || !isNaN(Date.parse(trimmed)) || !isNaN(Number(trimmed))
    );
  }
  return false;
};

const ListEmployee: React.FC = () => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [form] = Form.useForm<User>();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [employeeIdToDelete, setEmployeeIdToDelete] = useState<number | null>(
    null
  );

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/employees/extended`);
      if (!res.ok) throw new Error("Ошибка загрузки сотрудников");
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      messageApi.error((err as Error).message);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSave = async (values: Partial<User>) => {
    try {
      // Проверка: email уже существует?
      if (!editingEmployee && employees.some(emp => emp.Email === values.Email)) {
        messageApi.error("Пользователь с таким email уже существует");
        return;
      }
  
      // Проверка: пароль существует?
      if (
        values.Password &&
        employees.some(emp => emp.Password === values.Password)
      ) {
        messageApi.error("Пароль уже используется другим сотрудником");
        return;
      }
  
      // Проверка: длина и состав пароля
      if (
        values.Password &&
        (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(values.Password))
      ) {
        messageApi.error(
          "Пароль должен содержать минимум 8 символов, включая хотя бы одну букву и одну цифру"
        );
        return;
      }
      
  
      if (!editingEmployee) {
        const res = await fetch(`${API_URL}/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
  
        if (!res.ok) throw new Error("Ошибка при создании пользователя");
        messageApi.success("Сотрудник создан");
      } else {
        if (!values.Password) {
          delete values.Password;
        }
  
        const res = await fetch(
          `${API_URL}/api/users/${editingEmployee.ID_User}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          }
        );
  
        if (!res.ok) throw new Error("Ошибка при обновлении данных");
        messageApi.success("Сотрудник обновлён");
      }
  
      fetchEmployees();
      setIsModalVisible(false);
      setEditingEmployee(null);
      form.resetFields();
    } catch (err) {
      messageApi.error((err as Error).message);
    }
  };
  

  const handleArchive = async (id: number, archive: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Archived: archive }),
      });

      if (!res.ok) throw new Error("Ошибка при архивации");
      messageApi.success(
        archive ? "Сотрудник архивирован" : "Сотрудник восстановлен"
      );
      await fetchEmployees();
    } catch (err) {
      messageApi.error((err as Error).message);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/export/employees?format=${format}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Ошибка экспорта");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `employees_export.${
        format === "excel" ? "xlsx" : format === "word" ? "docx" : "pdf"
      }`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      messageApi.error((err as Error).message);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!employeeIdToDelete) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${employeeIdToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Ошибка при удалении");
      messageApi.success("Сотрудник удалён окончательно");
      fetchEmployees();
    } catch (err) {
      messageApi.error((err as Error).message);
    } finally {
      setConfirmDeleteVisible(false);
      setEmployeeIdToDelete(null);
    }
  };

  const filteredEmployees = employees
    .filter((emp) =>
      `${emp.First_Name} ${emp.Last_Name} ${emp.Email} ${emp.Phone} ${emp.Roles} ${emp.Teams} ${emp.Projects} ${emp.Tasks}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
    .filter((emp) => (emp.Archived ? true : false) === showArchive);

  const columns: ColumnsType<User> = [
    {
      title: <div style={{ textAlign: "center" }}>Аватар</div>,
      dataIndex: "Avatar",
      key: "Avatar",
      align: "center",
      render: (avatar, record) => (
        <Avatar src={avatar ? `${API_URL}/uploads/${avatar}` : undefined}>
          {!avatar && record.First_Name?.[0]}
        </Avatar>
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>Имя</div>,
      dataIndex: "First_Name",
      key: "First_Name",
      align: "center",
      render: (text) => (
        <div
          style={{ textAlign: isNumericOrDateOrDash(text) ? "center" : "left" }}
        >
          {text}
        </div>
      ),
      sorter: (a, b) => a.First_Name.localeCompare(b.First_Name),
    },
    {
      title: <div style={{ textAlign: "center" }}>Фамилия</div>,
      dataIndex: "Last_Name",
      key: "Last_Name",
      align: "center",
      render: (text) => (
        <div
          style={{ textAlign: isNumericOrDateOrDash(text) ? "center" : "left" }}
        >
          {text}
        </div>
      ),
      sorter: (a, b) => a.Last_Name.localeCompare(b.Last_Name),
    },
    {
      title: <div style={{ textAlign: "center" }}>Email</div>,
      dataIndex: "Email",
      key: "Email",
      align: "center",
      render: (text) => (
        <div
          style={{ textAlign: isNumericOrDateOrDash(text) ? "center" : "left" }}
        >
          {text}
        </div>
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>Телефон</div>,
      dataIndex: "Phone",
      key: "Phone",
      align: "center",
      render: (text) => {
        const formatted = text?.startsWith("+") ? text : `+${text}`;
        return (
          <div
            style={{
              textAlign: isNumericOrDateOrDash(formatted) ? "center" : "left",
            }}
          >
            {formatted}
          </div>
        );
      },
    },

    {
      title: <div style={{ textAlign: "center" }}>Роли</div>,
      dataIndex: "Roles",
      key: "Roles",
      align: "center",
      render: (text) => (
        <div
          style={{ textAlign: isNumericOrDateOrDash(text) ? "center" : "left" }}
        >
          {text}
        </div>
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>Команды</div>,
      dataIndex: "Teams",
      key: "Teams",
      align: "center",
      render: (text) => (
        <div
          style={{ textAlign: isNumericOrDateOrDash(text) ? "center" : "left" }}
        >
          {text}
        </div>
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>Проекты</div>,
      dataIndex: "Projects",
      key: "Projects",
      align: "center",
      render: (text) => (
        <div
          style={{ textAlign: isNumericOrDateOrDash(text) ? "center" : "left" }}
        >
          {text}
        </div>
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>Задачи</div>,
      dataIndex: "Tasks",
      key: "Tasks",
      align: "center",
      render: (text) => (
        <div
          style={{ textAlign: isNumericOrDateOrDash(text) ? "center" : "left" }}
        >
          {text}
        </div>
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>Действия</div>,
      key: "actions",
      align: "center",
      render: (_text, record) => {
        const buttonStyle = {
          width: 36,
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        };

        return record.Archived ? (
          <div
            style={{ display: "flex", justifyContent: "center", gap: "8px" }}
          >
            <Button
              type="link"
              style={buttonStyle}
              onClick={() => handleArchive(record.ID_User, false)}
              icon={<EditOutlined />}
            ></Button>
            <Button
              danger
              type="link"
              style={buttonStyle}
              onClick={() => {
                setEmployeeIdToDelete(record.ID_User);
                setConfirmDeleteVisible(true);
              }}
              icon={<DeleteOutlined />}
            ></Button>
          </div>
        ) : (
          <div
            style={{ display: "flex", justifyContent: "center", gap: "8px" }}
          >
            <Button
              type="link"
              style={buttonStyle}
              onClick={() => {
                setEditingEmployee(record);
                setIsModalVisible(true);
                form.setFieldsValue(record);
              }}
              icon={<EditOutlined />}
            ></Button>
            <Button
              danger
              type="link"
              style={buttonStyle}
              onClick={() => handleArchive(record.ID_User, true)}
              icon={<InboxOutlined />}
            ></Button>
          </div>
        );
      },
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      {contextHolder}
      <div className="dashboard">
        <HeaderManager />
        <div className="dashboard-body">
          <SidebarManager />
          <main className="main-content">
            <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: -2 }}>
              Сотрудники
            </h1>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: -12,
              }}
            >
              <Button
                className="dark-action-button"
                icon={<UserAddOutlined />}
                onClick={() => {
                  setEditingEmployee(null);
                  setIsModalVisible(true);
                  form.resetFields();
                }}
              >
                Добавить сотрудника
              </Button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <Input
                  placeholder="Поиск по сотрудникам..."
                  allowClear
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: 250 }}
                />

                <Button
                  onClick={() => setShowArchive(!showArchive)}
                  icon={<InboxOutlined />}
                >
                  {showArchive ? "Назад к активным" : "Архив"}
                </Button>

                <Dropdown
                  menu={{
                    onClick: ({ key }) => handleExport(key),
                    items: [
                      { key: "word", label: "Экспорт в Word (.docx)" },
                      { key: "excel", label: "Экспорт в Excel (.xlsx)" },
                      { key: "pdf", label: "Экспорт в PDF (.pdf)" },
                    ],
                  }}
                  placement="bottomRight"
                  arrow
                >
                  <Button icon={<DownloadOutlined />}>Экспорт</Button>
                </Dropdown>
              </div>
            </div>
            <h2 style={{ marginBottom: "0", fontWeight: "400" }}>
              {showArchive ? "Архивные сотрудники" : "Активные сотрудники"}
            </h2>

            <Table
              dataSource={filteredEmployees}
              columns={columns}
              rowKey="ID_User"
              pagination={{ pageSize: 10 }}
              style={{ marginTop: -40 }} // уменьшает расстояние между заголовком и таблицей
            />

            <Modal
              title={
                editingEmployee
                  ? "Редактировать сотрудника"
                  : "Добавить сотрудника"
              }
              open={isModalVisible}
              onCancel={() => setIsModalVisible(false)}
              onOk={() => form.submit()}
              okText="Сохранить"
              cancelText="Отмена"
            >
              <Form form={form} layout="vertical" onFinish={handleSave}>
                <Form.Item
                  name="First_Name"
                  label="Имя"
                  rules={[{ required: true, message: "Введите имя" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  name="Last_Name"
                  label="Фамилия"
                  rules={[{ required: true, message: "Введите фамилию" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  name="Email"
                  label="Email"
                  rules={[
                    { required: true, message: "Введите email" },
                    { type: "email", message: "Некорректный email!" },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        const allowedDomains = [
                          "gmail.com",
                          "outlook.com",
                          "hotmail.com",
                          "yahoo.com",
                          "icloud.com",
                          "me.com",
                          "mail.ru",
                          "yandex.ru",
                          "yandex.com",
                          "protonmail.com",
                          "zoho.com",
                          "gmx.com",
                        ];
                        const domain = value.split("@")[1];
                        return allowedDomains.includes(domain)
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error(
                                "Разрешены только домены: " +
                                  allowedDomains.join(", ")
                              )
                            );
                      },
                    },
                  ]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  name="Phone"
                  label="Телефон"
                  rules={[
                    { required: true, message: "Введите номер телефона" },
                    {
                      validator: (_, value) =>
                        value && value.length >= 10
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error("Некорректный номер телефона")
                            ),
                    },
                  ]}
                >
                  <PhoneInput
                    country={"by"}
                    enableSearch
                    onlyCountries={["ru", "by"]}
                    inputProps={{
                      name: "Phone",
                      required: true,
                      autoComplete: "off",
                      style: { width: "100%", paddingLeft: "48px" },
                    }}
                    dropdownStyle={{
                      backgroundColor: "#f5f5f5",
                      color: "#000",
                      border: "1px solid #ccc",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                    }}
                    searchStyle={{
                      backgroundColor: "#f5f5f5",
                      color: "#000",
                      border: "1px solid #ccc",
                    }}
                    buttonStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      borderRight: "1px solid #444",
                    }}
                  />
                </Form.Item>

                <Form.Item
                  name="Password"
                  label="Пароль"
                  rules={[
                    ...(editingEmployee
                      ? []
                      : [{ required: true, message: "Введите пароль" }]),
                    {
                      validator: (_, value) => {
                        if (!value && editingEmployee) return Promise.resolve();
                        if (!value || value.length < 8) {
                          return Promise.reject(
                            new Error("Пароль должен быть не менее 8 символов")
                          );
                        }
                        if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
                          return Promise.reject(
                            new Error(
                              "Пароль должен содержать как минимум одну букву и одну цифру"
                            )
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                  tooltip={
                    editingEmployee
                      ? "Оставьте пустым, чтобы не менять пароль"
                      : undefined
                  }
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              </Form>
            </Modal>

            <Modal
              title="Подтверждение удаления"
              open={confirmDeleteVisible}
              onOk={handleDeleteConfirmed}
              onCancel={() => setConfirmDeleteVisible(false)}
              okText="Да, удалить"
              cancelText="Отмена"
            >
              <p>
                Вы уверены, что хотите окончательно удалить этого сотрудника?
                Это действие необратимо.
              </p>
            </Modal>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ListEmployee;
