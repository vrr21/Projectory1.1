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
} from "antd";
import {
  UserAddOutlined,
  EditOutlined,
  InboxOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import SidebarManager from "../components/SidebarManager";
import HeaderManager from "../components/HeaderManager";
import "../styles/pages/ListEmployee.css";
import { useNavigate } from "react-router-dom";

import { theme } from "antd";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Radio } from "antd";

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
  ID_Role: number; // убрано "?"
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
  const [form] = Form.useForm<Partial<User> & { ID_Role: number }>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

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

  const handleSave = async (values: Partial<User> & { ID_Role: number }) => {
    try {
      console.log("Submitted values:", values);
  
      if (!editingEmployee) {
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: values.First_Name,
            lastName: values.Last_Name,
            phone: values.Phone,
            email: values.Email,
            password: values.Password,
            role: values.ID_Role === 1 ? "Менеджер" : "Сотрудник"
          }),
        });
        if (!res.ok) throw new Error("Ошибка при создании пользователя");
        messageApi.success("Сотрудник создан");
      }
       else {
        // Обновление данных
        const updatedValues = { ...values };
        if (!values.Password) {
          delete updatedValues.Password;
        }
        const res = await fetch(`${API_URL}/api/users/${editingEmployee.ID_User}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            First_Name: values.First_Name,
            Last_Name: values.Last_Name,
            Email: values.Email,
            Phone: values.Phone,
            Password: values.Password, // если пусто — бэкенд проигнорирует
            ID_Role: values.ID_Role
          }),
        });
        
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



  const handleDeleteConfirmed = async () => {
    try {
      await Promise.all(
        selectedRowKeys.map(async (id) => {
          const res = await fetch(`${API_URL}/api/users/${id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Ошибка при удалении");
        })
      );
      messageApi.success("Сотрудники удалены");
      fetchEmployees();
    } catch (err) {
      messageApi.error((err as Error).message);
    } finally {
      setConfirmDeleteVisible(false);
      setSelectedRowKeys([]);
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
      render: (avatar, record) => {
        const initials = `${record.First_Name?.[0] ?? ""}${
          record.Last_Name?.[0] ?? ""
        }`;
        return (
          <Avatar
            src={avatar ? `${API_URL}/uploads/${avatar}` : undefined}
            className="custom-avatar"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/employee/${record.ID_User}`)}
          >
            {!avatar && initials}
          </Avatar>
        );
      },
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
          style={{
            textAlign: isNumericOrDateOrDash(text) ? "center" : "left",
          }}
        >
          {text || "Не назначена"}
        </div>
      )
    },
    
    {
      title: <div style={{ textAlign: "center" }}>Команды</div>,
      dataIndex: "Teams",
      key: "Teams",
      align: "center",
      render: (text) => (
        <div
          style={{
            textAlign: isNumericOrDateOrDash(text) ? "center" : "left",
          }}
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
                setSelectedRowKeys([record.ID_User]);
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
                form.setFieldsValue({
                  ...record,
                  ID_Role: record.ID_Role || 2, // по умолчанию сотрудник, если нет роли
                });
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
                marginBottom: -24,
                marginTop: -12,
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

               
              </div>
            </div>

            <h2
              style={{
                marginBottom: "0",
                fontWeight: "400",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {showArchive ? (
                <>
                  <span>Архивные сотрудники</span>
                  <Button
                    danger
                    disabled={selectedRowKeys.length === 0}
                    onClick={() => setConfirmDeleteVisible(true)}
                    icon={<DeleteOutlined />}
                  >
                    Удалить выбранных
                  </Button>
                </>
              ) : (
                "Активные сотрудники"
              )}
            </h2>

            <Table
              {...(showArchive ? { rowSelection } : {})}
              dataSource={filteredEmployees}
              columns={columns}
              rowKey="ID_User"
              pagination={{ pageSize: 10 }}
              style={{ marginTop: -40 }}
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
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                initialValues={{
                  ID_Role: editingEmployee ? editingEmployee.ID_Role : 31,
                }}
              >
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
                    containerClass="custom-phone-container"
                    inputClass="custom-phone-input"
                    buttonClass="custom-phone-button"
                    dropdownClass="custom-phone-dropdown"
                    searchClass="custom-phone-search"
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
                <Form.Item
  name="ID_Role"
  label="Роль"
  rules={[{ required: true, message: "Выберите роль" }]}
>
  <Radio.Group>
    <Radio value={1}>Менеджер</Radio>
    <Radio value={31}>Сотрудник</Radio>
  </Radio.Group>
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
