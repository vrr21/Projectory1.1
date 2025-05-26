// front/src/pages/EmployeeReportsPage.tsx
import React, { useEffect, useState } from "react";
import {
  ConfigProvider,
  Table,
  Tabs,
  Divider,
  theme,
  Dropdown,
  Button,
  DatePicker,
  Input,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { FilterOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { Pie, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
} from "chart.js";
import Header from "../components/HeaderEmployee";
import SidebarEmployee from "../components/Sidebar";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/useAuth";
import { DownloadOutlined } from "@ant-design/icons";
ChartJS.register(
  ArcElement,
  ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement
);

type DateRecord = {
  Task_Date?: string;
  Start_Date?: string;
  End_Date?: string;
  Deadline?: string;
};

const { darkAlgorithm, defaultAlgorithm } = theme;
const { RangePicker } = DatePicker;
const API_URL = import.meta.env.VITE_API_URL;

interface TaskByType {
  Task_Type: string;
  Task_Count: number;
  Task_Date: string;
}

interface TaskByProject {
  Project_Name: string;
  Task_Count: number;
  Task_Date: string;
}

interface KanbanTask {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Status_Name: string;
  Order_Name: string;
  Team_Name: string;
  Deadline: string;
}

interface TimeTrackingEntry {
  Task_Name: string;
  Hours_Spent: number;
  Start_Date: string;
  End_Date: string;
}

const EmployeeReportsPage: React.FC = () => {
  const { theme: appTheme } = useTheme();
  const { user } = useAuth();
  const currentAlgorithm =
    appTheme === "dark" ? darkAlgorithm : defaultAlgorithm;
  const textColor = appTheme === "dark" ? "#ffffff" : "#000000";
  const gridColor =
    appTheme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)";

  const [loading, setLoading] = useState(true);
  const [tasksByType, setTasksByType] = useState<TaskByType[]>([]);
  const [tasksByProject, setTasksByProject] = useState<TaskByProject[]>([]);
  const [kanbanData, setKanbanData] = useState<KanbanTask[]>([]);
  const [timeTrackingData, setTimeTrackingData] = useState<TimeTrackingEntry[]>(
    []
  );
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [searchText, setSearchText] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<
    "all" | "active" | "closed"
  >("all");

  const applyDateFilter = <T extends DateRecord>(data: T[]) => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return data;
    const [start, end] = dateRange;
    return data.filter((item) => {
      const dateStr =
        item.Task_Date || item.Start_Date || item.End_Date || item.Deadline;
      if (!dateStr) return false;
      const date = dayjs(dateStr);
      return (
        date.isAfter(start.startOf("day")) && date.isBefore(end.endOf("day"))
      );
    });
  };

  const filterByStatus = <T extends { Status_Name?: string }>(
    data: T[]
  ): T[] => {
    if (taskStatusFilter === "all") return data;
    return data.filter((item) =>
      taskStatusFilter === "active"
        ? item.Status_Name !== "Завершена" && item.Status_Name !== "Закрыта"
        : item.Status_Name === "Завершена" || item.Status_Name === "Закрыта"
    );
  };

  const filteredTasksByType = filterByStatus(
    applyDateFilter(tasksByType) as (TaskByType & { Status_Name?: string })[]
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.email) return;

      try {
        const params = `?email=${encodeURIComponent(user.email)}`;
        const responses = await Promise.all([
          fetch(`${API_URL}/api/reports/employee/tasks-by-type${params}`).then(
            (res) => res.json()
          ),
          fetch(
            `${API_URL}/api/reports/employee/tasks-by-project${params}`
          ).then((res) => res.json()),
          fetch(
            `${API_URL}/api/reports/employee/kanban-overview${params}`
          ).then((res) => res.json()),
          fetch(`${API_URL}/api/reports/employee/time-tracking${params}`).then(
            (res) => res.json()
          ),
        ]);
        setTasksByType(responses[0]);
        setTasksByProject(responses[1]);
        setKanbanData(responses[2]);
        setTimeTrackingData(responses[3]);
      } catch (error) {
        console.error("Ошибка при загрузке данных отчётов:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);
  const getCellAlignment = (value: unknown): "left" | "center" => {
    if (typeof value === "number") return "center";
    if (
      typeof value === "string" &&
      dayjs(value).isValid() &&
      value.length >= 10
    )
      return "center";
    return "left";
  };

  const buildFilterMenu = (
    setRange: (range: [Dayjs, Dayjs] | null) => void
  ) => (
    <div
      style={{
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        alignItems: "stretch",
        minWidth: "160px",
      }}
    >
      <Button
        onClick={() => setRange([dayjs().startOf("day"), dayjs().endOf("day")])}
      >
        Сегодня
      </Button>
      <Button
        onClick={() =>
          setRange([dayjs().startOf("week"), dayjs().endOf("week")])
        }
      >
        Неделя
      </Button>
      <Button
        onClick={() =>
          setRange([dayjs().startOf("month"), dayjs().endOf("month")])
        }
      >
        Месяц
      </Button>
      <Button
        onClick={() =>
          setRange([dayjs().startOf("year"), dayjs().endOf("year")])
        }
      >
        Год
      </Button>
      <RangePicker
        style={{ width: "100%" }}
        onChange={(dates) =>
          dates && setRange([dates[0] as Dayjs, dates[1] as Dayjs])
        }
      />
      <Button danger onClick={() => setRange(null)}>
        Сбросить фильтр
      </Button>
    </div>
  );

  const kanbanColumns: ColumnsType<KanbanTask> = [
    {
      title: "Задача",
      dataIndex: "Task_Name",
      key: "Task_Name",
      align: "center",
      onCell: (record) => ({
        style: { textAlign: getCellAlignment(record.Task_Name) },
      }),
    },
    {
      title: "Описание",
      dataIndex: "Description",
      key: "Description",
      align: "center",
      onCell: (record) => ({
        style: { textAlign: getCellAlignment(record.Description) },
      }),
    },
    {
      title: "Статус",
      dataIndex: "Status_Name",
      key: "Status_Name",
      align: "center",
      onCell: (record) => ({
        style: { textAlign: getCellAlignment(record.Status_Name) },
      }),
    },
    {
      title: "Проект",
      dataIndex: "Order_Name",
      key: "Order_Name",
      align: "center",
      onCell: (record) => ({
        style: { textAlign: getCellAlignment(record.Order_Name) },
      }),
    },
    {
      title: "Команда",
      dataIndex: "Team_Name",
      key: "Team_Name",
      align: "center",
      onCell: (record) => ({
        style: { textAlign: getCellAlignment(record.Team_Name) },
      }),
    },
    {
      title: "Дедлайн",
      dataIndex: "Deadline",
      key: "Deadline",
      render: (date) => new Date(date).toLocaleDateString(),
      align: "center",
    },
  ];

  const timeTrackingColumns: ColumnsType<TimeTrackingEntry> = [
    {
      title: "Задача",
      dataIndex: "Task_Name",
      key: "Task_Name",
      align: "center",
      onCell: (record) => ({
        style: { textAlign: getCellAlignment(record.Task_Name) },
      }),
    },
    {
      title: "Часы",
      dataIndex: "Hours_Spent",
      key: "Hours_Spent",
      align: "center",
    },
    {
      title: "Начало",
      dataIndex: "Start_Date",
      key: "Start_Date",
      render: (date) => new Date(date).toLocaleString(),
      align: "center",
    },
    {
      title: "Окончание",
      dataIndex: "End_Date",
      key: "End_Date",
      render: (date) => new Date(date).toLocaleString(),
      align: "center",
    },
  ];

  const commonOptions = {
    plugins: {
      legend: { labels: { color: textColor } },
    },
    scales: {
      x: { ticks: { color: textColor }, grid: { color: gridColor } },
      y: {
        ticks: {
          color: textColor,
          stepSize: 1, // 🔧 Только целые числа
          callback: function (value: string | number) {
            return Number(value) % 1 === 0 ? value : null;
          },
        },
        grid: { color: gridColor },
      },
    },
  };

  const taskStatusMenu = (
    <Dropdown
      menu={{
        items: [
          { key: "all", label: "Все задачи" },
          { key: "active", label: "Текущие задачи" },
          { key: "closed", label: "Закрытые задачи" },
        ],
        onClick: ({ key }) =>
          setTaskStatusFilter(key as typeof taskStatusFilter),
      }}
      placement="bottomRight"
    >
      <Button>Фильтр задач</Button>
    </Dropdown>
  );

  const aggregatedTasksByType = filteredTasksByType.reduce(
    (acc: Record<string, number>, item) => {
      acc[item.Task_Type] = (acc[item.Task_Type] || 0) + item.Task_Count;
      return acc;
    },
    {}
  );

  const pieData = {
    labels: Object.keys(aggregatedTasksByType),
    datasets: [
      {
        data: Object.values(aggregatedTasksByType),
        backgroundColor: [
          "#1976D2",
          "#26A69A",
          "#FFB300",
          "#66BB6A",
          "#EF5350",
          "#AB47BC",
        ],
        borderColor: textColor,
        borderWidth: 0.3,
      },
    ],
  };

  const filteredTasksByProject = filterByStatus(
    applyDateFilter(tasksByProject) as (TaskByProject & {
      Status_Name?: string;
    })[]
  );

  const aggregatedTasksByProject = filteredTasksByProject.reduce(
    (acc: Record<string, number>, item) => {
      acc[item.Project_Name] = (acc[item.Project_Name] || 0) + item.Task_Count;
      return acc;
    },
    {}
  );

  const barData = {
    labels: Object.keys(aggregatedTasksByProject),
    datasets: [
      {
        label: "Количество задач",
        data: Object.values(aggregatedTasksByProject),
        backgroundColor: "#1976D2",
        maxBarThickness: 150,
      },
    ],
  };

  const dateFiltered = applyDateFilter(kanbanData);

  // Группируем: { [Project_Name]: { [Deadline]: count } }
  const grouped: Record<string, Record<string, number>> = {};

  dateFiltered.forEach((task) => {
    const dateKey = dayjs(task.Deadline).format("YYYY-MM-DD");
    const project = task.Order_Name;

    if (!grouped[project]) {
      grouped[project] = {};
    }

    grouped[project][dateKey] = (grouped[project][dateKey] || 0) + 1;
  });

  // Все уникальные даты (сортировка)
  const allDates = [
    ...new Set(dateFiltered.map((t) => dayjs(t.Deadline).format("YYYY-MM-DD"))),
  ].sort();

  // Строим datasets для каждого проекта
  const lineData = {
    labels: allDates,
    datasets: Object.keys(grouped).map((project) => ({
      label: project,
      data: allDates.map((date) => grouped[project][date] || 0),
      borderColor: "#" + Math.floor(Math.random() * 16777215).toString(16), // случайный цвет
      fill: false,
    })),
  };

  const handleExport = async (format: string) => {
    try {
      if (!user?.email) {
        console.error("Email пользователя не найден");
        return;
      }

      const token = localStorage.getItem("token"); // Или из useAuth, если он там есть

      if (!token) {
        console.error("Токен авторизации отсутствует");
        return;
      }

      const params = new URLSearchParams({
        format,
        email: user.email,
      });

      const res = await fetch(
        `${API_URL}/api/export/employee-reports?${params.toString()}`,
        {
          method: "GET",
          credentials: "include", // оставляем, если у вас есть cookie
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Добавляем токен
          },
        }
      );

      if (!res.ok) throw new Error("Ошибка при экспорте отчётов");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `employee_reports.${
          format === "word" ? "docx" : format === "excel" ? "xlsx" : format
        }`
      );

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Ошибка при экспорте:", error);
    }
  };

  const applySearchFilter = <T extends KanbanTask | TimeTrackingEntry>(
    data: T[]
  ) => {
    let filtered = data;

    if (taskStatusFilter !== "all" && "Status_Name" in data[0]) {
      filtered = filtered.filter((item: KanbanTask | TimeTrackingEntry) => {
        if ("Status_Name" in item) {
          return taskStatusFilter === "active"
            ? item.Status_Name !== "Завершена" && item.Status_Name !== "Закрыта"
            : item.Status_Name === "Завершена" ||
                item.Status_Name === "Закрыта";
        }
        return true; // Пропустить фильтрацию, если нет Status_Name (например, для TimeTrackingEntry)
      });
    }

    if (!searchText.trim()) return filtered;

    const lowerSearch = searchText.toLowerCase();
    return filtered.filter((item) =>
      Object.values(item as Record<keyof T, unknown>).some((value) =>
        typeof value === "string" || typeof value === "number"
          ? value.toString().toLowerCase().includes(lowerSearch)
          : false
      )
    );
  };

  const tabItems = [
    {
      key: "kanban",
      label: "Мои задачи",
      children: (
        <Table
          columns={kanbanColumns}
          dataSource={applySearchFilter(applyDateFilter(kanbanData))}
          rowKey="ID_Task"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: "time-tracking",
      label: "Мои отработанные часы",
      children: (
        <Table
          columns={timeTrackingColumns}
          dataSource={applySearchFilter(applyDateFilter(timeTrackingData))}
          rowKey={(record, index) => index?.toString() ?? ""}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ];

  if (loading) return <div>Загрузка данных...</div>;

  return (
    <ConfigProvider theme={{ algorithm: currentAlgorithm }}>
      <div className="dashboard employee-reports-page">
        <Header />
        <div className="dashboard-body">
          <SidebarEmployee role="employee" />
          <main className="main-content">
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 600,
                marginBottom: "-2px",
              }}
            >
              Мои отчёты
            </h1>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                margin: "-12px 0",
              }}
            >
              <Input
                placeholder="Поиск по всем данным..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: "250px" }}
              />
              {taskStatusMenu}
              <Dropdown
                menu={{
                  items: [
                    { key: "word", label: "Экспорт в Word (.docx)" },
                    { key: "excel", label: "Экспорт в Excel (.xlsx)" },
                    { key: "pdf", label: "Экспорт в PDF (.pdf)" },
                  ],
                  onClick: ({ key }) => handleExport(key),
                }}
                placement="bottomRight"
                arrow
              >
                <Button icon={<DownloadOutlined />}>Экспорт</Button>
              </Dropdown>
            </div>

            <div className="tabs-table-wrapper">
              <Tabs
                defaultActiveKey="kanban"
                tabBarGutter={0}
                items={tabItems.map((tab) => ({
                  ...tab,
                  label: <div style={{ padding: "8px 16px" }}>{tab.label}</div>,
                }))}
                tabBarStyle={{
                  margin: 0,
                  padding: 0,
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  border: "1px solid var(--border-color)",
                  borderBottom: "none",
                  overflow: "hidden",
                }}
              />
            </div>

            <Divider orientation="center">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Распределение моих задач по типам
                <Dropdown
                  overlay={buildFilterMenu(setDateRange)}
                  trigger={["click"]}
                >
                  <Button icon={<FilterOutlined />} />
                </Dropdown>
              </span>
            </Divider>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "20px 0",
              }}
            >
              <div style={{ width: "500px", height: "500px" }}>
                <Pie
                  data={pieData}
                  options={{ ...commonOptions, maintainAspectRatio: true }}
                />
              </div>
            </div>
            <Divider orientation="center">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Количество моих задач по проектам
                <Dropdown
                  overlay={buildFilterMenu(setDateRange)}
                  trigger={["click"]}
                >
                  <Button icon={<FilterOutlined />} />
                </Dropdown>
              </span>
            </Divider>

            <div
              style={{
                width: "1000px",
                height: "400px",
                margin: "0 auto",
                padding: "8px 0",
              }}
            >
              <Bar
                data={barData}
                options={{ ...commonOptions, maintainAspectRatio: false }}
              />
            </div>

            <Divider orientation="center">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Мои задачи по дедлайнам
                <Dropdown
                  overlay={buildFilterMenu(setDateRange)}
                  trigger={["click"]}
                >
                  <Button icon={<FilterOutlined />} />
                </Dropdown>
              </span>
            </Divider>

            <div
              style={{
                width: "1000px",
                height: "400px",
                margin: "0 auto",
                padding: "8px 0",
              }}
            >
              <Line
                data={lineData}
                options={{ ...commonOptions, maintainAspectRatio: false }}
              />
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default EmployeeReportsPage;
