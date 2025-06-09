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
import { PlusOutlined } from "@ant-design/icons";
import { Progress, Tabs } from "antd";
import { Collapse } from "antd";
const { Panel } = Collapse;
import { Pagination } from "antd";

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
  TaskCount?: number;
}

interface Team {
  ID_Team: number;
  Team_Name: string;
}

interface FormValues {
  Order_Name: string;
  Type_Name: string;
  End_Date: dayjs.Dayjs;
  Status: string;
  Team_Name: string;
}

interface Task {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Assigned_Employee_Id?: number;
  Status_Name: string;
  Deadline?: string;
  Time_Norm?: number;
  Employees?: { ID_User: number; ID_Employee?: number; Full_Name: string }[];
}

const ProjectManagementPage: React.FC = () => {
  const getTaskLabel = (count: number) => {
    if (count % 10 === 1 && count % 100 !== 11) return "задача";
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100))
      return "задачи";
    return "задач";
  };
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
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [projectIdToDelete, setProjectIdToDelete] = useState<number | null>(
    null
  );
  const [tasksMap, setTasksMap] = useState<{ [projectId: number]: Task[] }>({});
  const [orderLifecycleSearchTerm, setOrderLifecycleSearchTerm] = useState("");

  const [activeTab, setActiveTab] = useState<string>("projects");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const fetchTasksForProject = useCallback(
    async (projectId: number) => {
      try {
        const response = await fetch(
          `${API_URL}/api/tasks/by-project/${projectId}`
        );
        if (!response.ok) throw new Error("Ошибка при загрузке задач");
        const data: Task[] = await response.json();
        setTasksMap((prev) => ({ ...prev, [projectId]: data }));
      } catch {
        messageApi.error("Ошибка при загрузке задач");
      }
    },
    [messageApi]
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const projectsPerPage = 15;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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

  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * projectsPerPage,
    currentPage * projectsPerPage
  );
  const filteredOrderLifecycleProjects = paginatedProjects.filter((project) => {
    const combinedFields = `${project.Order_Name} ${project.Type_Name} ${
      project.Creation_Date
    } ${project.End_Date} ${project.Status} ${
      project.Team_Name || ""
    }`.toLowerCase();
    return combinedFields.includes(orderLifecycleSearchTerm.toLowerCase());
  });

  const calculateCompletionPercent = (tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(
      (task) =>
        task.Status_Name === "Выполнена" || task.Status_Name === "Завершена"
    ).length;
    return Math.round((completed / tasks.length) * 100);
  };

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
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Ошибка при загрузке проектов");
      const data: Project[] = await response.json();

      // Подгружаем задачи для каждого проекта, чтобы посчитать TaskCount
      const projectsWithTaskCounts = await Promise.all(
        data.map(async (proj) => {
          const team = teams.find((t) => t.ID_Team === proj.ID_Team);
          let taskCount = 0;
          try {
            const tasksResponse = await fetch(
              `${API_URL}/api/tasks/by-project/${proj.ID_Order}`
            );
            if (tasksResponse.ok) {
              const tasksData: Task[] = await tasksResponse.json();
              taskCount = tasksData.length;
              setTasksMap((prev) => ({ ...prev, [proj.ID_Order]: tasksData }));
            }
          } catch {
            // ignore
          }
          return {
            ...proj,
            Team_Name: team?.Team_Name || "—",
            TaskCount: taskCount,
          };
        })
      );

      setProjects(projectsWithTaskCounts);
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
        End_Date: dayjs(project.End_Date), // ⬅️ Преобразуем дату в dayjs
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
      const duplicateProject = projects.find(
        (p) =>
          p.Order_Name.toLowerCase() === values.Order_Name.toLowerCase() &&
          (!editingProject || p.ID_Order !== editingProject.ID_Order)
      );

      if (duplicateProject) {
        messageApi.error("Проект с таким названием уже существует.");
        return;
      }

      const teamId = await getOrCreateTeam(values.Team_Name);

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

      const token = localStorage.getItem("token");
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  const handleConfirmDelete = (id: number): void => {
    setProjectIdToDelete(id);
    setConfirmDeleteVisible(true);
  };
  const handleDeleteConfirmed = async (): Promise<void> => {
    if (!projectIdToDelete) return;

    try {
      const response = await fetch(
        `${API_URL}/api/projects/${projectIdToDelete}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Ошибка при удалении проекта");
      messageApi.success("Проект удалён окончательно");
      fetchProjects();
    } catch (error: unknown) {
      if (error instanceof Error) messageApi.error(error.message);
    } finally {
      setConfirmDeleteVisible(false);
      setProjectIdToDelete(null);
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
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ data: filteredProjects }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
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
        messageApi.error(error.message || "Ошибка при экспорте");
      } else {
        messageApi.error("Произошла неизвестная ошибка.");
      }
    }
  };

  const taskColumns: ColumnsType<Task> = [
    {
      title: "Название задачи",
      dataIndex: "Task_Name",
      key: "Task_Name",
      render: (text: string) => (
        <span style={{ color: "var(--text-color)" }}>{text}</span>
      ),
    },
    {
      title: "Описание",
      dataIndex: "Description",
      key: "Description",
      render: (text: string) => (
        <span style={{ color: "var(--secondary-text-color)" }}>{text}</span>
      ),
    },
    {
      title: "Исполнитель",
      dataIndex: "Assigned_Employee_Id",
      key: "Assigned_Employee_Id",
      render: (_, record) => {
        const assignedEmployee = record.Employees?.find(
          (emp) => emp.ID_Employee === record.Assigned_Employee_Id
        );
        return (
          <span style={{ color: "var(--text-color)" }}>
            {assignedEmployee?.Full_Name || "Не назначено"}
          </span>
        );
      },
    },
    {
      title: "Статус",
      dataIndex: "Status_Name",
      key: "Status_Name",
      render: (text: string) => (
        <span style={{ color: "var(--text-color)" }}>{text}</span>
      ),
    },
    {
      title: "Дедлайн",
      dataIndex: "Deadline",
      key: "Deadline",
      render: (date: string) => (
        <span style={{ color: "var(--text-color)" }}>
          {date ? dayjs(date).format("YYYY-MM-DD HH:mm") : "—"}
        </span>
      ),
    },
    {
      title: "Норма времени (ч.)",
      dataIndex: "Time_Norm",
      key: "Time_Norm",
      render: (time: number) => (
        <span style={{ color: "var(--text-color)" }}>{time}</span>
      ),
    },
  ];

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
            <div className="table-action-buttons">
              <Button
                type="link"
                onClick={() =>
                  showModal({ ...record, Status: "В процессе" }, true)
                }
                icon={<EditOutlined />}
              >
                Восстановить
              </Button>
              <Button
                type="link"
                danger
                onClick={() => handleConfirmDelete(record.ID_Order)}
                icon={<InboxOutlined />}
              >
                Удалить
              </Button>
            </div>
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
                  marginBottom: "64px",
                }}
              >
                Управление проектами
              </h1>

              <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                  setActiveTab(key);
                  if (key === "order-lifecycle" && selectedProject) {
                    fetchTasksForProject(selectedProject.ID_Order);
                  }
                }}
                type="card"
                style={{ marginBottom: 24 }}
              >
                <Tabs.TabPane tab="Проекты" key="projects">
                  <>
                    {/* 🚀 Весь основной блок с кнопками и таблицей */}
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
                        icon={<PlusOutlined style={{ color: "inherit" }} />}
                      >
                        Добавить проект
                      </Button>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Input
                          placeholder="Поиск по всем проектам..."
                          allowClear
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ width: "250px" }}
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
                              { key: "word", label: "Экспорт в Word (.docx)" },
                              {
                                key: "excel",
                                label: "Экспорт в Excel (.xlsx)",
                              },
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
                      {showArchive ? "Закрытые проекты" : "Текущие проекты"}
                    </h2>

                    <Table
                      dataSource={filteredProjects}
                      columns={columns}
                      rowKey="ID_Order"
                      onRow={(record) => ({
                        onClick: () => {
                          setSelectedProject(record);
                          setActiveTab("order-lifecycle");
                          fetchTasksForProject(record.ID_Order);
                        },
                      })}
                    />

                    {/* Модальное окно формы (без изменений) */}
                    <Modal
                      title={
                        editingProject
                          ? "Редактировать проект"
                          : "Создать проект"
                      }
                      open={isModalVisible}
                      onCancel={handleCancel}
                      onOk={() => form.submit()}
                    >
                      <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFinish}
                      >
                        <Form.Item
                          name="Order_Name"
                          label="Название проекта"
                          rules={[
                            {
                              required: true,
                              message: "Введите название проекта",
                            },
                          ]}
                        >
                          <Input />
                        </Form.Item>

                        <Form.Item
                          name="Type_Name"
                          label="Тип проекта"
                          rules={[
                            { required: true, message: "Введите тип проекта" },
                          ]}
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
          return Promise.reject(new Error("Пожалуйста, выберите дату окончания"));
        const selectedDate = dayjs(value).startOf("day");
        const today = dayjs().startOf("day");
        const maxDate = today.add(1, "year");

        if (selectedDate.isBefore(today)) {
          return Promise.reject(new Error("Нельзя выбрать прошедшую дату"));
        }

        if (selectedDate.isAfter(maxDate)) {
          return Promise.reject(
            new Error(`Максимальный срок — ${maxDate.format("YYYY-MM-DD")}`)
          );
        }

        return Promise.resolve();
      },
    },
  ]}
>
  <DatePicker
    style={{ width: "100%" }}
    showTime={{ format: "HH:mm" }}
    format="YYYY-MM-DD HH:mm"
    popupClassName="custom-datepicker-popup"
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
                            options={teams.map((team) => ({
                              value: team.Team_Name,
                            }))}
                            placeholder="Выберите или введите команду"
                            allowClear
                          />
                        </Form.Item>
                      </Form>
                    </Modal>
                  </>
                </Tabs.TabPane>

                <Tabs.TabPane tab="ЖЦ заказа" key="order-lifecycle">
                  <div style={{ padding: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <h2 style={{ color: "var(--text-color)", margin: 0 }}>
                        Жизненный цикл заказа (все проекты)
                      </h2>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Input
                          placeholder="Поиск по ЖЦ заказа..."
                          allowClear
                          value={orderLifecycleSearchTerm}
                          onChange={(e) =>
                            setOrderLifecycleSearchTerm(e.target.value)
                          }
                          style={{ width: "250px" }}
                        />
                      </div>
                    </div>

                    <Collapse
                      accordion
                      bordered={false}
                      style={{
                        backgroundColor: "var(--card-bg-color)",
                        color: "var(--text-color)",
                      }}
                      expandIconPosition="end"
                      onChange={(key) => {
                        const openedKey = Array.isArray(key) ? key[0] : key;
                        if (openedKey) {
                          fetchTasksForProject(Number(openedKey));
                        }
                      }}
                    >
                      {filteredOrderLifecycleProjects.map((proj, index) => {
                        const tasks = tasksMap[proj.ID_Order] || [];
                        return (
                          <Panel
                            header={
                              <span style={{ color: "var(--text-color)" }}>
                                {(currentPage - 1) * projectsPerPage +
                                  index +
                                  1}
                                . {proj.Order_Name} ({proj.TaskCount ?? 0}{" "}
                                {getTaskLabel(proj.TaskCount ?? 0)})
                              </span>
                            }
                            key={proj.ID_Order}
                            style={{
                              backgroundColor: "var(--card-bg-color)",
                              color: "var(--text-color)",
                              borderBottom: "1px solid var(--border-color)",
                            }}
                          >
                            {/* Информация о проекте */}
                            <div style={{ marginBottom: 16 }}>
                              <p style={{ color: "#aaa" }}>
                                <strong>Название проекта:</strong>{" "}
                                {proj.Order_Name}
                              </p>
                              <p style={{ color: "#aaa" }}>
                                <strong>Тип проекта:</strong> {proj.Type_Name}
                              </p>
                              <p style={{ color: "#aaa" }}>
                                <strong>Команда:</strong>{" "}
                                {proj.Team_Name || "—"}
                              </p>
                              <p style={{ color: "#aaa" }}>
                                <strong>Дата начала:</strong>{" "}
                                {dayjs(proj.Creation_Date).format("YYYY-MM-DD")}
                              </p>
                              <p style={{ color: "#aaa" }}>
                                <strong>Дата окончания:</strong>{" "}
                                {dayjs(proj.End_Date).format("YYYY-MM-DD")}
                              </p>
                              <p style={{ color: "#aaa" }}>
                                <strong>Статус проекта:</strong> {proj.Status}
                              </p>
                            </div>

                            {/* Задачи по проекту */}
                            <div style={{ marginBottom: 16 }}>
                              <h3
                                style={{ color: "#fff", marginBottom: "16px" }}
                              >
                                Задачи по проекту:
                              </h3>
                              {tasks.length === 0 ? (
                                <p style={{ color: "#aaa" }}>Не назначено</p>
                              ) : (
                                <Table
                                  dataSource={tasks}
                                  columns={taskColumns}
                                  rowKey="ID_Task"
                                  pagination={false}
                                />
                              )}
                            </div>

                            {/* Степень готовности */}
                            <div>
                              <h3 style={{ color: "#fff" }}>
                                Степень готовности:
                              </h3>
                              {proj.Status === "Завершён" ? (
                                <p style={{ color: "#aaa" }}>
                                  Степень готовности: Закрыт
                                </p>
                              ) : tasks.length === 0 ? (
                                <p style={{ color: "#aaa" }}>
                                  Степень готовности: не назначено
                                </p>
                              ) : (
                                <Progress
                                  percent={calculateCompletionPercent(tasks)}
                                  strokeColor={{
                                    "0%": "#00bcd4",
                                    "100%": "#87d068",
                                  }}
                                />
                              )}
                            </div>
                          </Panel>
                        );
                      })}
                    </Collapse>

                    {/* Пагинация справа */}
                    {filteredProjects.length > projectsPerPage && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginTop: 16,
                        }}
                      >
                        <Pagination
                          current={currentPage}
                          pageSize={projectsPerPage}
                          total={filteredProjects.length}
                          onChange={handlePageChange}
                          showSizeChanger={false}
                        />
                      </div>
                    )}
                  </div>
                </Tabs.TabPane>
              </Tabs>

              {/* Дополнительные модальные окна */}
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

              <Modal
                title="Подтверждение удаления"
                open={confirmDeleteVisible}
                onOk={handleDeleteConfirmed}
                onCancel={() => setConfirmDeleteVisible(false)}
                okText="Да, удалить"
                cancelText="Отмена"
              >
                <p>
                  Вы уверены, что хотите окончательно удалить этот проект? Это
                  действие необратимо.
                </p>
              </Modal>
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ProjectManagementPage;
