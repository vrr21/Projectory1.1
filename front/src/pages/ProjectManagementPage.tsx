import React, { useState, useEffect, useCallback } from "react";
import {
  ConfigProvider,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  theme,
  AutoComplete,
  Dropdown,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  EditOutlined,
  DownloadOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { DatePicker } from "antd";
import Header from "../components/HeaderManager";
import SidebarManager from "../components/SidebarManager";
import "../styles/pages/ProjectManagementPage.css";

const { darkAlgorithm } = theme;
const API_URL = import.meta.env.VITE_API_URL;

interface Project {
  ID_Order: number;
  Order_Name: string;
  Type_Name: string;
  Creation_Date: string;
  End_Date: string;
  Status: string;
  ID_Team?: number;
  Team_Name?: string;
}

interface Team {
  ID_Team: number;
  Team_Name: string;
}

interface FormValues {
  Order_Name: string;
  Type_Name: string;
  End_Date: string;
  Status: string;
  Team_Name: string;
}

const ProjectManagementPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [showArchive, setShowArchive] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmCloseVisible, setConfirmCloseVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );

  const fetchTeams = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/teams`);
      if (!response.ok) throw new Error("Ошибка при загрузке команд");
      const data: Team[] = await response.json();
      setTeams(data);
    } catch (error: unknown) {
      if (error instanceof Error) messageApi.error(error.message);
    }
  }, [messageApi]);

  const fetchProjects = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/projects`);
      if (!response.ok) throw new Error("Ошибка при загрузке проектов");
      const data: Project[] = await response.json();

      const projectsWithTeamNames = data.map((proj) => {
        const team = teams.find((t) => t.ID_Team === proj.ID_Team);
        return {
          ...proj,
          Team_Name: team?.Team_Name || "—",
        };
      });

      for (const proj of data) {
        const isExpired =
          proj.End_Date &&
          dayjs(proj.End_Date).isBefore(dayjs()) &&
          proj.Status !== "Завершён";
        if (isExpired) {
          await fetch(`${API_URL}/api/projects/${proj.ID_Order}/close`, {
            method: "PATCH",
          });
        }
      }

      setProjects(projectsWithTeamNames);
    } catch (error: unknown) {
      if (error instanceof Error) messageApi.error(error.message);
    }
  }, [messageApi, teams]);

  useEffect(() => {
    (async () => {
      await fetchTeams();
    })();
  }, [fetchTeams]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const showModal = (project?: Project, restoring: boolean = false): void => {
    setEditingProject(project || null);
    setIsRestoring(restoring);
    setIsModalVisible(true);
    if (project) {
      form.setFieldsValue({
        ...project,
        Team_Name: project.Team_Name || "",
      });
    } else {
      form.resetFields();
    }
  };

  const handleCancel = (): void => {
    setIsModalVisible(false);
    setEditingProject(null);
    form.resetFields();
  };

  const getOrCreateTeam = async (teamName: string): Promise<number> => {
    const existingTeam = teams.find(
      (team) => team.Team_Name.toLowerCase() === teamName.toLowerCase()
    );
    if (existingTeam) return existingTeam.ID_Team;

    const response = await fetch(`${API_URL}/api/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Team_Name: teamName }),
    });

    if (!response.ok) throw new Error("Ошибка при создании команды");

    const newTeam: Team = await response.json();
    await fetchTeams();
    return newTeam.ID_Team;
  };

  const handleFinish = async (values: FormValues): Promise<void> => {
    try {
      const teamId = await getOrCreateTeam(values.Team_Name);

      // ✅ Проверка количества проектов у этой команды
      const projectsForTeam = projects.filter(
        (p) => p.ID_Team === teamId && p.Status !== "Завершён"
      );

      if (!editingProject && projectsForTeam.length >= 2) {
        messageApi.error(
          "На одну команду нельзя назначить более 2 активных проектов."
        );
        return;
      }

      const payload = {
        Order_Name: values.Order_Name,
        Type_Name: values.Type_Name,
        Creation_Date:
          editingProject?.Creation_Date ?? dayjs().format("YYYY-MM-DD"),
        End_Date: values.End_Date,
        Status: isRestoring ? "В процессе" : "Новый",
        ID_Team: teamId,
      };

      const url = editingProject
        ? `${API_URL}/api/projects/${editingProject.ID_Order}`
        : `${API_URL}/api/projects`;
      const method = editingProject ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Ошибка при сохранении проекта");
      messageApi.success(editingProject ? "Проект обновлён" : "Проект создан");
      fetchProjects();
      handleCancel();
    } catch (error: unknown) {
      if (error instanceof Error) messageApi.error(error.message);
    }
  };

  const handleConfirmClose = (id: number): void => {
    setSelectedProjectId(id);
    setConfirmCloseVisible(true);
  };

  const handleCloseConfirmed = async (): Promise<void> => {
    if (!selectedProjectId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/projects/${selectedProjectId}/close`,
        {
          method: "PATCH",
        }
      );
      if (!response.ok) throw new Error("Ошибка при закрытии проекта");
      messageApi.success("Проект закрыт");
      fetchProjects();
    } catch (error: unknown) {
      if (error instanceof Error) messageApi.error(error.message);
    } finally {
      setConfirmCloseVisible(false);
      setSelectedProjectId(null);
    }
  };

  const handleExport = async (format: string): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/export/projects?format=${format}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Ошибка экспорта:", errorText);
        throw new Error(errorText || "Ошибка при экспорте");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      let extension = "txt";
      if (format === "excel") extension = "xlsx";
      else if (format === "word") extension = "docx";
      else if (format === "pdf") extension = "pdf";

      link.setAttribute("download", `projects_export.${extension}`);

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Ошибка экспорта:", error.message);
        messageApi.error(error.message);
      } else {
        messageApi.error("Произошла неизвестная ошибка.");
      }
    }
  };

  // Фильтр проектов по поисковому запросу и состоянию архива
  const filteredProjects = projects.filter((project) => {
    const combinedFields = `${project.Order_Name} ${project.Type_Name} ${
      project.Creation_Date
    } ${project.End_Date} ${project.Status} ${
      project.Team_Name || ""
    }`.toLowerCase();
    const matchesSearch = combinedFields.includes(searchTerm.toLowerCase());
    const matchesArchiveFilter = showArchive
      ? project.Status === "Завершён"
      : project.Status !== "Завершён";
    return matchesSearch && matchesArchiveFilter;
  });

  const columns: ColumnsType<Project> = [
    {
      title: <div style={{ textAlign: "center" }}>Название проекта</div>,
      dataIndex: "Order_Name",
      key: "Order_Name",
      align: "center",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
      sorter: (a, b) => a.Order_Name.localeCompare(b.Order_Name),
    },
    {
      title: <div style={{ textAlign: "center" }}>Тип проекта</div>,
      dataIndex: "Type_Name",
      key: "Type_Name",
      align: "center",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
      sorter: (a, b) => a.Type_Name.localeCompare(b.Type_Name),
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
      sorter: (a, b) =>
        dayjs(a.Creation_Date).unix() - dayjs(b.Creation_Date).unix(),
    },
    {
      title: <div style={{ textAlign: "center" }}>Дата окончания</div>,
      dataIndex: "End_Date",
      key: "End_Date",
      align: "center",
      render: (date: string) => (
        <div style={{ textAlign: "left" }}>
          {date ? dayjs(date).format("YYYY-MM-DD") : ""}
        </div>
      ),
      sorter: (a, b) => dayjs(a.End_Date).unix() - dayjs(b.End_Date).unix(),
    },
    {
      title: <div style={{ textAlign: "center" }}>Статус</div>,
      dataIndex: "Status",
      key: "Status",
      align: "center",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
      sorter: (a, b) => a.Status.localeCompare(b.Status),
    },
    {
      title: <div style={{ textAlign: "center" }}>Команда</div>,
      dataIndex: "Team_Name",
      key: "Team_Name",
      align: "center",
      render: (text: string) => <div style={{ textAlign: "left" }}>{text}</div>,
      sorter: (a, b) => (a.Team_Name || "").localeCompare(b.Team_Name || ""),
    },
    {
      title: <div style={{ textAlign: "center" }}>Действия</div>,
      key: "actions",
      align: "center",
      render: (_text, record) => {
        if (record.Status === "Завершён") {
          return (
            <Button
              type="link"
              onClick={() =>
                showModal({ ...record, Status: "В процессе" }, true)
              }
              icon={<EditOutlined />}
            >
              Восстановить
            </Button>
          );
        }

        return (
          <div className="table-action-buttons">
            <Button
              type="link"
              onClick={() => showModal(record)}
              icon={<EditOutlined />}
            >
              Редактировать
            </Button>
            <Button
              type="link"
              danger
              onClick={() => handleConfirmClose(record.ID_Order)}
              icon={<InboxOutlined />}
            >
              Закрыть проект
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      {contextHolder}
      <div className="dashboard">
        <Header />
        <div className="dashboard-body">
          <SidebarManager />
          <main className="main-content">
            <div className="project-management-page">
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  marginBottom: "24px",
                }}
              >
                Управление проектами
              </h1>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <Button
                  className="dark-action-button"
                  onClick={() => showModal()}
                >
                  Добавить проект
                </Button>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Input
                    className="project-search-input"
                    placeholder="Поиск по всем проектам..."
                    allowClear
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ minWidth: 250 }}
                  />

                  <Button
                    onClick={() => setShowArchive(!showArchive)}
                    icon={<InboxOutlined />}
                  >
                    {showArchive ? "Назад к активным" : "Архив проектов"}
                  </Button>
                  <Dropdown
                    menu={{
                      onClick: ({ key }) => handleExport(key),
                      items: [
                        { key: "word", label: "Экспорт в Word" },
                        { key: "excel", label: "Экспорт в Excel" },
                        { key: "pdf", label: "Экспорт в PDF" },
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
                {showArchive ? "Закрытые проекты" : "Текущие проекты"}
              </h2>

              <Table
                dataSource={filteredProjects}
                columns={columns}
                rowKey="ID_Order"
              />

              <Modal
                title={
                  editingProject ? "Редактировать проект" : "Создать проект"
                }
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={() => form.submit()}
              >
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                  <Form.Item
                    name="Order_Name"
                    label="Название проекта"
                    rules={[
                      { required: true, message: "Введите название проекта" },
                    ]}
                  >
                    <Input />
                  </Form.Item>

                  <Form.Item
                    name="Type_Name"
                    label="Тип проекта"
                    rules={[{ required: true, message: "Введите тип проекта" }]}
                  >
                    <Input />
                  </Form.Item>

                  <Form.Item
                    name="End_Date"
                    label="Дата окончания"
                    rules={[
                      {
                        required: true,
                        message: "Пожалуйста, выберите дату окончания",
                      },
                      {
                        validator: async (_, value) => {
                          if (!value)
                            return Promise.reject(
                              new Error("Пожалуйста, выберите дату окончания")
                            );
                          const selectedDate = dayjs(value).startOf("day");
                          const today = dayjs().startOf("day");
                          const maxDate = today.add(1, "year");

                          if (selectedDate.isBefore(today)) {
                            return Promise.reject(
                              new Error("Нельзя выбрать прошедшую дату")
                            );
                          }

                          if (selectedDate.isAfter(maxDate)) {
                            return Promise.reject(
                              new Error(
                                `Максимальный срок — ${maxDate.format(
                                  "YYYY-MM-DD"
                                )}`
                              )
                            );
                          }

                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      disabledDate={(current) => {
                        const today = dayjs().startOf("day");
                        const maxDate = today.add(1, "year");
                        return (
                          current &&
                          (current.isBefore(today) || current.isAfter(maxDate))
                        );
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="Team_Name"
                    label="Команда"
                    rules={[
                      {
                        required: true,
                        message: "Выберите или введите команду",
                      },
                    ]}
                  >
                    <AutoComplete
                      style={{ width: "100%" }}
                      options={teams.map((team) => {
                        const relatedProjects =
                          projects
                            .filter(
                              (p) =>
                                p.Team_Name === team.Team_Name &&
                                p.Status !== "Завершён"
                            )
                            .map((p) => p.Order_Name)
                            .join(", ") || "нет проекта";

                        return {
                          value: team.Team_Name,
                          label: `${team.Team_Name} (${relatedProjects})`,
                        };
                      })}
                      placeholder="Выберите или введите команду"
                      allowClear
                    />
                  </Form.Item>
                </Form>
              </Modal>
            </div>
          </main>
        </div>
      </div>
      <Modal
        title="Подтверждение"
        open={confirmCloseVisible}
        onOk={handleCloseConfirmed}
        onCancel={() => setConfirmCloseVisible(false)}
        okText="Да, закрыть"
        cancelText="Отмена"
      >
        <p>Вы уверены, что хотите закрыть этот проект?</p>
      </Modal>
    </ConfigProvider>
  );
};

export default ProjectManagementPage;
