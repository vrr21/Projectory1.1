import React, { useEffect, useState, useCallback } from "react";
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  message,
  ConfigProvider,
  theme,
  App as AntdApp,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  InboxOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { PlusOutlined } from "@ant-design/icons";
import Header from "../components/HeaderManager";
import SidebarManager from "../components/SidebarManager";
import "../styles/pages/TeamManagementPage.css";
import { Dropdown } from "antd";
import { theme as antdTheme } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface TeamMember {
  ID_User: number;
  fullName: string;
  email: string;
  role: string;
}

interface User {
  id: number;
  fullName: string;
  email: string;
}

interface Team {
  ID_Team: number;
  Team_Name: string;
  Status: string; // добавить это поле
  members: TeamMember[];
}
interface MemberWithRole {
  userId: number;
  role: string;
}

const TeamManagementPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isTeamModalVisible, setIsTeamModalVisible] = useState(false);
  const [isAddMembersModalVisible, setIsAddMembersModalVisible] =
    useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [teamForm] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [roles, setRoles] = useState<{ label: string; value: string }[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [archivedTeams, setArchivedTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTeamName, setEditTeamName] = useState("");
  const [confirmAction, setConfirmAction] = useState<null | (() => void)>(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const { token } = antdTheme.useToken();
  const [isRoleRulesModalVisible, setIsRoleRulesModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isEditMemberModalVisible, setIsEditMemberModalVisible] =
    useState(false);

  const showConfirmModal = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setIsConfirmModalVisible(true);
  };

  const [editMemberForm] = Form.useForm();

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/roles`);
      if (!res.ok) throw new Error(await res.text());
      const data: string[] = await res.json();

      const formattedRoles = data
        .filter((role: string) => role && role.trim() !== "") // типизация здесь
        .map((role: string) => ({ label: role, value: role })); // и здесь

      setRoles(formattedRoles);
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при загрузке ролей");
    }
  }, [messageApi]);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams`);
      if (!res.ok) throw new Error(await res.text());
      const data: Team[] = await res.json();

      const active = data.filter((t) => t.Status !== "Архив");
      const archived = data.filter((t) => t.Status === "Архив");

      setTeams(active);
      setArchivedTeams(archived);
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при загрузке команд");
    }
  }, [messageApi]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/employees`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const formattedUsers: User[] = data.map(
        (u: {
          ID_User: number;
          First_Name: string;
          Last_Name: string;
          Email?: string;
        }) => ({
          id: u.ID_User,
          fullName: `${u.First_Name} ${u.Last_Name}`,
          email: u.Email ?? "no-email@example.com",
        })
      );

      setUsers(formattedUsers);
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при загрузке сотрудников");
    }
  }, [messageApi]);

  useEffect(() => {
    fetchTeams();
    fetchUsers();
    fetchRoles();
  }, [fetchTeams, fetchUsers, fetchRoles]);

  const handleExport = async (format: string) => {
    try {
      const exportFormat = format === "docx" ? "word" : format;
  
      const response = await fetch(`${API_URL}/api/export/teams?format=${exportFormat}`);
  
      if (!response.ok) {
        throw new Error(await response.text());
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
  
      let extension = "txt";
      if (format === "excel") extension = "xlsx";
      else if (format === "docx") extension = "docx";
      else if (format === "pdf") extension = "pdf";
  
      a.href = url;
      a.download = `teams.${extension}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      messageApi.error("Ошибка экспорта. Пожалуйста, попробуйте снова.");
    }
  };
  

  const getTeamNameFilters = () => {
    const unique = Array.from(new Set(teams.map((t) => t.Team_Name)));
    return unique.map((name) => ({ text: name, value: name }));
  };

  // Рядом с импортами уже должен быть roleLimits
  const roleLimits: Record<string, number> = {
    Менеджер: 1,
    "Менеджер (Администратор)": 1,
    "Scrum Master": 1,
    "Product Owner": 1,
    Тимлид: 1,
    "Архитектор ПО": 2,
    "Бизнес-аналитик": 2,
    Аналитик: 2,
    "Техник-программист": 7,
    "Frontend-разработчик": 4,
    "Backend-разработчик": 4,
    "Fullstack-разработчик": 4,
    Тестировщик: 3,
    "Дизайнер UX/UI": 2,
    "DevOps-инженер": 2,
    "Системный администратор": 2,
    "Специалист по безопасности": 1,
    "Технический писатель": 2,
    Маркетолог: 2,
    "HR-менеджер": 1,
    "Координатор проектов": 1,
  };

  const getRoleFilters = () => {
    const allRoles = teams.flatMap((t) => t.members.map((m) => m.role));
    const uniqueRoles = Array.from(new Set(allRoles));
    return uniqueRoles.map((role) => ({ text: role, value: role }));
  };

  const handleAddMember = async (values: { userId: number; role: string }) => {
    if (!currentTeamId) return;

    // Проверка: пользователь уже состоит в другой команде
    const isInAnotherTeam = teams.some(
      (team) =>
        team.ID_Team !== currentTeamId &&
        team.members.some((member) => member.ID_User === values.userId)
    );
    if (isInAnotherTeam) {
      const user = users.find((u) => u.id === values.userId);
      messageApi.error(
        `Сотрудник ${
          user?.fullName || values.userId
        } уже состоит в другой команде`
      );
      return;
    }

    // Проверка превышения лимита
    const team = teams.find((t) => t.ID_Team === currentTeamId);
    if (team) {
      const currentRoleCount = team.members.filter(
        (m) => m.role === values.role
      ).length;
      const maxAllowed = roleLimits[values.role] || Infinity;
      if (currentRoleCount >= maxAllowed) {
        messageApi.error(
          `Нельзя добавить больше ${maxAllowed} сотрудника(ов) на роль "${values.role}" в эту команду`
        );
        return;
      }
    }

    const selectedUser = users.find((user) => user.id === values.userId);
    if (!selectedUser) {
      messageApi.error("Пользователь не найден");
      return;
    }

    const body = {
      teamId: currentTeamId,
      fullName: selectedUser.fullName,
      email: selectedUser.email,
      role: values.role,
    };

    try {
      const res = await fetch(`${API_URL}/api/teams/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) {
        messageApi.error(result.message || "Ошибка при добавлении участника");
        return;
      }

      memberForm.resetFields();
      await fetchTeams();
      messageApi.success("Участник добавлен");
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при добавлении участника");
    }
  };

  const handleDeleteMember = async (teamId: number, memberId: number) => {
    try {
      const res = await fetch(
        `${API_URL}/api/teams/${teamId}/remove/${memberId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) throw new Error(await res.text());
      messageApi.success("Участник удалён");
      fetchTeams();
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при удалении участника");
    }
  };

  const handleDeleteTeam = (teamId: number) => {
    showConfirmModal(
      "Внимание! При удалении команды:\n" +
        "- Все связанные проекты будут закрыты.\n" +
        '- Все задачи будут переведены в статус "Завершена".\n\n' +
        "Вы уверены, что хотите продолжить?",
      async () => {
        try {
          const res = await fetch(
            `${API_URL}/api/teams/${teamId}/archive-with-projects-and-tasks`,
            {
              method: "PATCH",
            }
          );
          if (!res.ok) throw new Error(await res.text());
          messageApi.success(
            "Команда и связанные элементы успешно архивированы"
          );
          fetchTeams();
        } catch (err) {
          console.error(err);
          messageApi.error(
            "Ошибка при архивации команды и связанных элементов"
          );
        }
      }
    );
  };

  const handleRestoreTeam = (teamId: number) => {
    showConfirmModal(
      "Вы уверены, что хотите восстановить команду?",
      async () => {
        try {
          const res = await fetch(`${API_URL}/api/teams/${teamId}/restore`, {
            method: "PATCH",
          });
          if (!res.ok) throw new Error(await res.text());
          messageApi.success("Команда восстановлена");
          fetchTeams();
        } catch (err) {
          console.error(err);
          messageApi.error("Ошибка при восстановлении команды");
        }
      }
    );
  };

  const handlePermanentDeleteTeam = (teamId: number) => {
    showConfirmModal(
      "Вы уверены, что хотите окончательно удалить команду? Это действие необратимо.",
      async () => {
        try {
          const res = await fetch(`${API_URL}/api/teams/${teamId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error(await res.text());
          messageApi.success("Команда окончательно удалена");
          fetchTeams();
        } catch (err) {
          console.error(err);
          messageApi.error("Ошибка при окончательном удалении команды");
        }
      }
    );
  };

  const columns: ColumnsType<Team> = [
    {
      title: <div style={{ textAlign: "center" }}>Название команды</div>,
      dataIndex: "Team_Name",
      key: "Team_Name",
      align: "left",
      filters: getTeamNameFilters(),
      onFilter: (value, record) => record.Team_Name === value,
      render: (text, team) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{text}</span>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setCurrentTeamId(team.ID_Team);
              setEditTeamName(team.Team_Name);
              setIsEditModalVisible(true);
            }}
          />
        </div>
      ),
    },

    {
      title: <div style={{ textAlign: "center" }}>Участники</div>,
      key: "members",
      align: "left", // Содержимое по левому краю
      filters: getRoleFilters(),
      onFilter: (value, record) => record.members.some((m) => m.role === value),
      render: (_, team) => (
        <div>
         {team.members.map((m) => (
  <div key={`${team.ID_Team}-${m.ID_User ?? m.email ?? m.fullName}`}>
    {m.fullName} ({m.role}) — {m.email}
    <Button
      type="link"
      icon={<EditOutlined />}
      size="small"
      style={{ marginLeft: 4 }}
      onClick={() => {
        setCurrentTeamId(team.ID_Team);
        setEditingMember(m);
        editMemberForm.setFieldsValue({ role: m.role });
        setIsEditMemberModalVisible(true);
      }}
    >
      Ред.
    </Button>
    <Button
      type="link"
      danger
      size="small"
      onClick={() => handleDeleteMember(team.ID_Team, m.ID_User)}
      icon={<DeleteOutlined />}
      style={{ marginLeft: 8 }}
    >
      Удалить
    </Button>
  </div>
))}

        </div>
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>Действия</div>,
      key: "actions",
      align: "center", // Кнопки по центру
      render: (_, team) => {
        if (showArchive) {
          return (
            <div
              style={{ display: "flex", justifyContent: "center", gap: "8px" }}
            >
              <Button
                type="default"
                icon={<ReloadOutlined />}
                style={{
                  minWidth: "150px",
                  justifyContent: "center",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-color)",
                }}
                onClick={() => handleRestoreTeam(team.ID_Team)}
              >
                Восстановить
              </Button>
              <Button
                type="default"
                danger
                icon={<DeleteOutlined />}
                style={{
                  minWidth: "150px",
                  justifyContent: "center",
                  border: "1px solid var(--border-color)",
                }}
                onClick={() => handlePermanentDeleteTeam(team.ID_Team)}
              >
                Удалить окончательно
              </Button>
            </div>
          );
        }

        return (
          <div
            style={{ display: "flex", justifyContent: "center", gap: "4px" }}
          >
            <Button
              type="default"
              icon={<EditOutlined />}
              style={{
                minWidth: "150px",
                justifyContent: "center",
                border: "1px solid var(--border-color)",
                color: "var(--text-color)",
              }}
              onClick={() => {
                setCurrentTeamId(team.ID_Team);
                setIsAddMembersModalVisible(true);
              }}
            >
              Добавить участников
            </Button>
            <Button
              type="default"
              icon={<DeleteOutlined />}
              danger
              style={{
                minWidth: "150px",
                justifyContent: "center",
                border: "1px solid var(--border-color)",
              }}
              onClick={() => handleDeleteTeam(team.ID_Team)} // ✅ исправлено
            >
              Удалить команду
            </Button>
          </div>
        );
      },
    },
  ];

  const handleEditTeamName = async (teamId: number, newTeamName: string) => {
    if (!newTeamName.trim()) {
      messageApi.error("Название команды не может быть пустым");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Team_Name: newTeamName }),
      });

      if (!res.ok) throw new Error(await res.text());
      messageApi.success("Название команды успешно обновлено");
      fetchTeams();
    } catch (err) {
      console.error(err);
      messageApi.error("Ошибка при обновлении названия команды");
    }
  };

  const filteredTeams = (showArchive ? archivedTeams : teams).filter((team) => {
    const combinedFields = `${team.Team_Name} ${team.members
      .map((m) => `${m.fullName} ${m.role} ${m.email}`)
      .join(" ")}`.toLowerCase();
    return combinedFields.includes(searchTerm.toLowerCase());
  });

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <AntdApp>
        {contextHolder}
        <div className="dashboard">
          <Header />
          <div className="dashboard-body">
            <SidebarManager />
            <main className="main-content team-management-page">
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  marginBottom: "24px",
                }}
              >
                Управление командами
              </h1>
              <div
                className="button-wrapper"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <Button
                  type="primary"
                  className="create-team-button"
                  onClick={() => setIsTeamModalVisible(true)}
                  icon={<PlusOutlined style={{ color: "inherit" }} />}
                >
                  Создать команду
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
                    placeholder="Поиск по всем данным..."
                    allowClear
                    onChange={(e) => setSearchTerm((e.target.value ?? "").toLowerCase())}

                    style={{ width: 250 }}
                  />
                  <Button
                    onClick={() => setShowArchive(!showArchive)}
                    icon={<InboxOutlined />}
                  >
                    {showArchive ? "Назад к активным командам" : "Архив команд"}
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

              <h2 style={{ marginBottom: "8px", fontWeight: "400" }}>
                {showArchive ? "Удалённые команды" : "Список команд"}
              </h2>

              <Table
                dataSource={filteredTeams}
                columns={columns}
                rowKey="ID_Team"
                style={{ marginTop: 20 }}
                pagination={{ pageSize: 5 }}
              />
              <Modal
                title="Создание команды"
                open={isTeamModalVisible}
                onCancel={() => setIsTeamModalVisible(false)}
                onOk={() => teamForm.submit()}
                okText="Создать"
                cancelText="Отмена"
              >
                <Form
                  form={teamForm}
                  layout="vertical"
                  onFinish={async (values) => {
                    const members = values.membersWithRoles || [];
                    if (members.length < 3) {
                      Modal.error({
                        title: "Ошибка создания команды",
                        content:
                          "Минимум 3 участника должны быть выбраны с ролями.",
                      });

                      return;
                    }

                    const duplicateUsers = members.map(
                      (m: MemberWithRole) => m.userId
                    );

                    const uniqueUsers = [...new Set(duplicateUsers)];
                    if (uniqueUsers.length !== duplicateUsers.length) {
                      messageApi.error(
                        "Один и тот же участник не может быть выбран дважды"
                      );
                      return;
                    }

                    // Проверка: пользователь уже состоит в другой команде
                    for (const m of members) {
                      const alreadyInTeam = teams.some((team) =>
                        team.members.some((member) => member.ID_User === m.userId)
                      );
                      if (alreadyInTeam) {
                        const user = users.find((u) => u.id === m.userId);
                        messageApi.error(
                          `Сотрудник ${user?.fullName || m.userId} уже состоит в команде`
                        );
                        return;
                      }
                    }
                    

                    const teamName = values.name.trim();
                    if (!teamName) {
                      messageApi.error("Название команды не может быть пустым");
                      return;
                    }

                    const duplicate = teams.some(
                      (team) =>
                        team.Team_Name.trim().toLowerCase() ===
                        teamName.toLowerCase()
                    );
                    if (duplicate) {
                      messageApi.error(
                        "Команда с таким названием уже существует"
                      );
                      return;
                    }

                    const payload = {
                      Team_Name: teamName,
                      Status: "В процессе",
                      Members: members.map((m: MemberWithRole) => ({
                        userId: m.userId,
                        role: m.role,
                      })),
                    };

                    try {
                      const res = await fetch(
                        `${API_URL}/api/teams/with-members`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        }
                      );

                      if (!res.ok) throw new Error(await res.text());

                      await fetchTeams();
                      teamForm.resetFields();
                      setIsTeamModalVisible(false);
                      messageApi.success("Команда успешно создана");
                    } catch (err) {
                      console.error(err);
                      messageApi.error("Ошибка при создании команды");
                    }
                  }}
                >
                  <Form.Item
                    name="name"
                    label="Название команды"
                    rules={[
                      { required: true, message: "Введите название команды" },
                    ]}
                  >
                    <Input />
                  </Form.Item>

                  <Form.List
                    name="membersWithRoles"
                    rules={[
                      {
                        validator: async (_, members) => {
                          if (!members || members.length < 3) {
                            return Promise.reject(
                              new Error("Минимум 3 участника")
                            );
                          }
                        },
                      },
                    ]}
                  >
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <div key={key} style={{ marginBottom: "16px" }}>
                            <Form.Item
                              {...restField}
                              name={[name, "userId"]}
                              rules={[
                                {
                                  required: true,
                                  message: "Выберите участника",
                                },
                              ]}
                            >
                              <Select
                                placeholder="Участник"
                                showSearch
                                optionFilterProp="children"
                              >
                                {users
                                  .filter(
                                    (user) =>
                                      !teams.some((team) =>
                                        team.members.some(
                                          (member) => member.ID_User === user.id
                                        )
                                      )
                                  )
                                  .map((user) => (
                                    <Select.Option
                                      key={user.id}
                                      value={user.id}
                                    >
                                      {user.fullName} — {user.email}
                                    </Select.Option>
                                  ))}
                              </Select>
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, "role"]}
                              label={
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <span>Роль</span>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<InfoCircleOutlined />}
                                    onClick={() =>
                                      setIsRoleRulesModalVisible(true)
                                    }
                                    style={{
                                      padding: 0,
                                      color: "inherit",
                                      background: "transparent",
                                      border: "none",
                                      boxShadow: "none",
                                      cursor: "pointer",
                                    }}
                                  />
                                </div>
                              }
                              rules={[
                                { required: true, message: "Выберите роль" },
                              ]}
                            >
                              <Select
                                placeholder="Роль"
                                showSearch
                                optionFilterProp="label"
                                options={roles}
                              />
                            </Form.Item>
                            <Button
                              danger
                              onClick={() => remove(name)}
                              style={{ marginBottom: "8px" }}
                            >
                              Удалить
                            </Button>
                          </div>
                        ))}
                        <Form.Item>
                          <Button type="dashed" onClick={() => add()} block>
                            Добавить участника
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Form>
              </Modal>

              <Modal
                title="Добавление участника"
                open={isAddMembersModalVisible}
                onCancel={() => {
                  setIsAddMembersModalVisible(false);
                  memberForm.resetFields();
                }}
                footer={null}
              >
                <Form
                  form={memberForm}
                  layout="vertical"
                  onFinish={handleAddMember}
                >
                  <Form.Item
                    name="userId"
                    label="Сотрудник"
                    rules={[{ required: true, message: "Выберите сотрудника" }]}
                  >
                    <Select
                      showSearch
                      placeholder="Выберите сотрудника"
                      optionFilterProp="children"
                      allowClear
                    >
                      {users
                        .filter(
                          (user) =>
                            !teams.some((team) =>
                              team.members.some(
                                (member) => member.ID_User === user.id
                              )
                            )
                        )
                        .map((user) => (
                          <Select.Option key={user.id} value={user.id}>
                            {user.fullName} — {user.email}
                          </Select.Option>
                        ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="role"
                    label={
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                        }}
                      >
                        <span>Должность</span>
                        <Button
                          type="text"
                          size="small"
                          icon={<InfoCircleOutlined />}
                          onClick={() => setIsRoleRulesModalVisible(true)}
                          style={{
                            padding: 0,
                            color: "inherit",
                            background: "transparent",
                            border: "none",
                            boxShadow: "none",
                            cursor: "pointer",
                          }}
                        />
                      </div>
                    }
                    rules={[{ required: true, message: "Выберите должность" }]}
                  >
                    <Select
                      options={roles}
                      showSearch
                      optionFilterProp="label"
                      allowClear
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button type="dashed" htmlType="submit" block>
                      Добавить участника
                    </Button>
                  </Form.Item>
                </Form>
              </Modal>
              <Modal
                title="Редактировать название команды"
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                onOk={() => {
                  if (currentTeamId !== null) {
                    handleEditTeamName(currentTeamId, editTeamName);
                    setIsEditModalVisible(false);
                  }
                }}
                okText="Сохранить"
                cancelText="Отмена"
              >
                <Input
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  placeholder="Введите новое название команды"
                />
              </Modal>

              <Modal
                open={isConfirmModalVisible}
                onCancel={() => setIsConfirmModalVisible(false)}
                onOk={() => {
                  if (confirmAction) confirmAction();
                  setIsConfirmModalVisible(false);
                }}
                okText="Да"
                cancelText="Нет"
              >
                <p>{confirmMessage}</p>
              </Modal>
              <Modal
                title="Правила назначения ролей"
                open={isRoleRulesModalVisible}
                onOk={() => setIsRoleRulesModalVisible(false)}
                footer={[
                  <Button
                    key="ok"
                    type="primary"
                    onClick={() => setIsRoleRulesModalVisible(false)}
                  >
                    Понятно
                  </Button>,
                ]}
                styles={{
                  body: {
                    backgroundColor: token.colorBgElevated,
                    color: token.colorText,
                    borderRadius: "8px",
                    padding: "16px",
                    maxHeight: "400px",
                    overflowY: "auto",
                  },
                }}
                style={{
                  backgroundColor: token.colorBgElevated,
                }}
                closable={false} // Отключает крестик в верхнем углу
              >
                <div>
                  {Object.entries(roleLimits).map(([role, limit]) => (
                    <p key={role} style={{ margin: "4px 0" }}>
                      <strong>{role}</strong>: до {limit} чел.
                    </p>
                  ))}
                </div>
              </Modal>
              {/* ======== Новый Modal для редактирования участника ======== */}
              <Modal
                title="Редактирование участника"
                open={isEditMemberModalVisible}
                onCancel={() => {
                  setIsEditMemberModalVisible(false);
                  editMemberForm.resetFields();
                }}
                onOk={() => editMemberForm.submit()}
                okText="Сохранить"
                cancelText="Отмена"
              >
                <Form
                  form={editMemberForm}
                  layout="vertical"
                  onFinish={async (values) => {
                    if (!editingMember || !currentTeamId) return;

                    try {
                      const res = await fetch(
                        `${API_URL}/api/teams/${currentTeamId}/members/${editingMember.ID_User}`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ role: values.role }),
                        }
                      );

                      const result = await res.json();
                      if (!res.ok) {
                        messageApi.error(
                          result.message || "Ошибка при обновлении роли"
                        );
                        return;
                      }

                      fetchTeams();
                      setIsEditMemberModalVisible(false);
                      messageApi.success("Роль успешно обновлена");
                    } catch (err) {
                      console.error(err);
                      messageApi.error("Ошибка при обновлении участника");
                    }
                  }}
                >
                  <Form.Item
                    name="role"
                    label="Новая роль"
                    rules={[{ required: true, message: "Выберите роль" }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={roles}
                      placeholder="Выберите новую роль"
                    />
                  </Form.Item>
                </Form>
              </Modal>
            </main>
          </div>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
};

export default TeamManagementPage;
