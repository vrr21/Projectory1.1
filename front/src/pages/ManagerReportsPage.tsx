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
  ChartDataset,
} from "chart.js";
import Header from "../components/HeaderManager";
import SidebarManager from "../components/SidebarManager";
import { useTheme } from "../contexts/ThemeContext";
import { DownloadOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/useAuth";

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

interface TaskByProjectType {
  Task_Type: string; // ← Исправлено
  Task_Count: number;
  Task_Date: string;
}

interface TaskByEmployee {
  Employee_Name: string;
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
  Employee_Name: string;
  Task_Name: string;
  Hours_Spent: number;
  Start_Date: string;
  End_Date: string;
}

const ManagerReportsPage: React.FC = () => {
  const { theme: appTheme } = useTheme();
  const { user } = useAuth();

  const currentAlgorithm =
    appTheme === "dark" ? darkAlgorithm : defaultAlgorithm;
  const textColor = appTheme === "dark" ? "#ffffff" : "#000000";
  const gridColor =
    appTheme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)";

  const [loading, setLoading] = useState(true);
  const [tasksByProjectType, setTasksByProjectType] = useState<
    TaskByProjectType[]
  >([]);
  const [tasksByEmployee, setTasksByEmployee] = useState<TaskByEmployee[]>([]);
  const [tasksByProject, setTasksByProject] = useState<TaskByProject[]>([]);
  const [kanbanData, setKanbanData] = useState<KanbanTask[]>([]);
  const [timeTrackingData, setTimeTrackingData] = useState<TimeTrackingEntry[]>(
    []
  );
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const responses = await Promise.all([
          fetch(`${API_URL}/api/reports/tasks-by-project-type`).then((res) =>
            res.json()
          ),
          fetch(`${API_URL}/api/reports/tasks-by-employee`).then((res) =>
            res.json()
          ),
          fetch(`${API_URL}/api/reports/tasks-by-project`).then((res) =>
            res.json()
          ),
          fetch(`${API_URL}/api/reports/kanban-overview`).then((res) =>
            res.json()
          ),
          fetch(`${API_URL}/api/reports/employee-time-tracking`).then((res) =>
            res.json()
          ),
        ]);
        setTasksByProjectType(responses[0]);
        setTasksByEmployee(responses[1]);
        setTasksByProject(responses[2]);
        setKanbanData(responses[3]);
        setTimeTrackingData(responses[4]);
      } catch (error) {
        console.error("Ошибка при загрузке данных отчётов:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
  // Вставить после const API_URL = import.meta.env.VITE_API_URL;
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
    <div style={{ padding: 8 }}>
      <Button
        block
        onClick={() => setRange([dayjs().startOf("day"), dayjs().endOf("day")])}
      >
        Сегодня
      </Button>
      <Button
        block
        onClick={() =>
          setRange([dayjs().startOf("week"), dayjs().endOf("week")])
        }
      >
        Неделя
      </Button>
      <Button
        block
        onClick={() =>
          setRange([dayjs().startOf("month"), dayjs().endOf("month")])
        }
      >
        Месяц
      </Button>
      <Button
        block
        onClick={() =>
          setRange([dayjs().startOf("year"), dayjs().endOf("year")])
        }
      >
        Год
      </Button>
      <RangePicker
        style={{ marginTop: 8, width: "100%" }}
        onChange={(dates) =>
          dates && setRange([dates[0] as Dayjs, dates[1] as Dayjs])
        }
      />
      <Button
        block
        danger
        style={{ marginTop: 8 }}
        onClick={() => setRange(null)}
      >
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
      align: "center",
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  const timeTrackingColumns: ColumnsType<TimeTrackingEntry> = [
    {
      title: "Сотрудник",
      dataIndex: "Employee_Name",
      key: "Employee_Name",
      align: "center",
      onCell: (record) => ({
        style: { textAlign: getCellAlignment(record.Employee_Name) },
      }),
    },
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
      align: "center",
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: "Окончание",
      dataIndex: "End_Date",
      key: "End_Date",
      align: "center",
      render: (date) => new Date(date).toLocaleString(),
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
          stepSize: 1,
          callback: function (value: string | number) {
            return Number(value) % 1 === 0 ? value : null;
          },
        },
        grid: { color: gridColor },
      },
    },
    maintainAspectRatio: false,
  };

  const groupedByProjectType = applyDateFilter(tasksByProjectType).reduce(
    (acc, item) => {
      if (!item.Task_Type) return acc;
      if (!acc[item.Task_Type]) acc[item.Task_Type] = 0;
      acc[item.Task_Type] += item.Task_Count;
      return acc;
    },
    {} as Record<string, number>
  );

  const pieData = {
    labels: Object.keys(groupedByProjectType),
    datasets: [
      {
        data: Object.values(groupedByProjectType),
        backgroundColor: [
          "#1976D2",
          "#26A69A",
          "#FFB300",
          "#66BB6A",
          "#EF5350",
          "#AB47BC",
          "#5C6BC0",
          "#EC407A",
          "#FFA726",
          "#42A5F5",
          "#9CCC65",
          "#FF7043",
        ],
        borderColor: textColor,
        borderWidth: 0.3,
      },
    ],
  };

  const groupedTasksByEmployee = applyDateFilter(tasksByEmployee).reduce(
    (acc, curr) => {
      if (!acc[curr.Employee_Name]) {
        acc[curr.Employee_Name] = 0;
      }
      acc[curr.Employee_Name] += curr.Task_Count;
      return acc;
    },
    {} as Record<string, number>
  );

  const barData = {
    labels: Object.keys(groupedTasksByEmployee),
    datasets: [
      {
        label: "Количество задач",
        data: Object.values(groupedTasksByEmployee),
        backgroundColor: "#1976D2",
      },
    ],
  };

  const lineData = {
    labels: applyDateFilter(tasksByProject).map((item) =>
      dayjs(item.Task_Date).format("DD.MM.YYYY")
    ),
    datasets: applyDateFilter(tasksByProject).reduce(
      (acc: ChartDataset<"line">[], item) => {
        const existing = acc.find((d) => d.label === item.Project_Name);
        if (existing) existing.data.push(item.Task_Count);
        else
          acc.push({
            label: item.Project_Name,
            data: [item.Task_Count],
            borderColor: "#26A69A",
            fill: false,
          });
        return acc;
      },
      []
    ),
  };

  const applySearchFilter = <T extends KanbanTask | TimeTrackingEntry>(
    data: T[]
  ) => {
    if (!searchText.trim()) return data;
    const lowerSearch = searchText.toLowerCase();
    return data.filter((item) =>
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
      label: "Журнал задач на проекты",
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
      label: "Отчёт по отработанным часам",
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

  const handleExport = async (format: string) => {
    try {
      if (!user?.email) {
        console.error("Email пользователя не найден");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("Токен авторизации отсутствует");
        return;
      }

      const params = new URLSearchParams({
        format,
        email: user.email, // ✅ Вставляем email менеджера в URL
      });

      const res = await fetch(
        `${API_URL}/api/export/reports?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
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
        `reports.${
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

  if (loading) return <div>Загрузка данных...</div>;
  return (
    <ConfigProvider theme={{ algorithm: currentAlgorithm }}>
      <div className="dashboard">
        <Header />
        <div className="dashboard-body">
          <SidebarManager />
          <main className="main-content">
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 600,
                marginBottom: "-2px",
              }}
            >
              Отчёты по сотрудникам
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

            <Divider>
              <span>Распределение задач по типу проекта</span>
              <Dropdown
                dropdownRender={() => buildFilterMenu(setDateRange)}
                trigger={["click"]}
              >
                <Button icon={<FilterOutlined />} style={{ marginLeft: 8 }} />
              </Dropdown>
            </Divider>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "8px 0",
              }}
            >
              <div style={{ width: "500px", height: "500px" }}>
                <Pie
                  data={pieData}
                  options={{ ...commonOptions, maintainAspectRatio: true }}
                />
              </div>
            </div>

            <Divider>
              <span>Количество задач по сотрудникам</span>
              <Dropdown
                overlay={buildFilterMenu(setDateRange)}
                trigger={["click"]}
              >
                <Button icon={<FilterOutlined />} style={{ marginLeft: 8 }} />
              </Dropdown>
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

            <Divider>
              <span>Количество задач проектов по датам</span>
              <Dropdown
                overlay={buildFilterMenu(setDateRange)}
                trigger={["click"]}
              >
                <Button icon={<FilterOutlined />} style={{ marginLeft: 8 }} />
              </Dropdown>
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

export default ManagerReportsPage;
