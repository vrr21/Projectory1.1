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
import { FilterOutlined, SearchOutlined } from "@ant-design/icons";
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
import Header from "../components/HeaderEmployee";
import SidebarEmployee from "../components/Sidebar";
import { useTheme } from "../contexts/ThemeContext";
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
    },
    {
      title: "Описание",
      dataIndex: "Description",
      key: "Description",
      align: "center",
    },
    {
      title: "Статус",
      dataIndex: "Status_Name",
      key: "Status_Name",
      align: "center",
    },
    {
      title: "Проект",
      dataIndex: "Order_Name",
      key: "Order_Name",
      align: "center",
    },
    {
      title: "Команда",
      dataIndex: "Team_Name",
      key: "Team_Name",
      align: "center",
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
      title: "Задача",
      dataIndex: "Task_Name",
      key: "Task_Name",
      align: "center",
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
      y: { ticks: { color: textColor }, grid: { color: gridColor } },
    },
  };

  const pieData = {
    labels: applyDateFilter(tasksByType).map((item) => item.Task_Type),
    datasets: [
      {
        data: applyDateFilter(tasksByType).map((item) => item.Task_Count),
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

  const barData = {
    labels: applyDateFilter(tasksByProject).map((item) => item.Project_Name),
    datasets: [
      {
        label: "Количество задач",
        data: applyDateFilter(tasksByProject).map((item) => item.Task_Count),
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
      label: "Мои задачи",
      children: (
        <Table
          columns={kanbanColumns}
          dataSource={applySearchFilter(applyDateFilter(kanbanData))}
          rowKey="ID_Task"
          pagination={false}
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
          pagination={false}
        />
      ),
    },
  ];

  if (loading) return <div>Загрузка данных...</div>;

  return (
    <ConfigProvider theme={{ algorithm: currentAlgorithm }}>
      <div className="dashboard">
        <Header />
        <div className="dashboard-body">
          <SidebarEmployee role="employee" />
          <main className="main-content">
            <h1>Мои отчёты</h1>
            <Input
              placeholder="Поиск по всем данным..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ marginBottom: "16px", width: "300px" }}
            />
            <Tabs defaultActiveKey="kanban" items={tabItems} />
            <Divider orientation="left">
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <strong>Распределение моих задач по типам</strong>
                <Dropdown
                  overlay={buildFilterMenu(setDateRange)}
                  trigger={["click"]}
                >
                  <Button icon={<FilterOutlined />} />
                </Dropdown>
              </div>
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
            <Divider orientation="left">
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <strong>Количество моих задач по проектам</strong>
                <Dropdown
                  overlay={buildFilterMenu(setDateRange)}
                  trigger={["click"]}
                >
                  <Button icon={<FilterOutlined />} />
                </Dropdown>
              </div>
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

            <Divider orientation="left">
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <strong>Мои задачи по датам</strong>
                <Dropdown
                  overlay={buildFilterMenu(setDateRange)}
                  trigger={["click"]}
                >
                  <Button icon={<FilterOutlined />} />
                </Dropdown>
              </div>
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
