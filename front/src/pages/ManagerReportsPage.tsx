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
import Header from "../components/HeaderManager";
import SidebarManager from "../components/SidebarManager";

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

const { darkAlgorithm } = theme;
const { RangePicker } = DatePicker;
const API_URL = import.meta.env.VITE_API_URL;

interface TaskByProjectType {
  Project_Type: string;
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
  const [loading, setLoading] = useState(true);
  const [tasksByProjectType, setTasksByProjectType] = useState<TaskByProjectType[]>([]);
  const [tasksByEmployee, setTasksByEmployee] = useState<TaskByEmployee[]>([]);
  const [tasksByProject, setTasksByProject] = useState<TaskByProject[]>([]);
  const [kanbanData, setKanbanData] = useState<KanbanTask[]>([]);
  const [timeTrackingData, setTimeTrackingData] = useState<TimeTrackingEntry[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [searchText, setSearchText] = useState("");
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const responses = await Promise.all([
          fetch(`${API_URL}/api/reports/tasks-by-project-type`).then((res) => res.json()),
          fetch(`${API_URL}/api/reports/tasks-by-employee`).then((res) => res.json()),
          fetch(`${API_URL}/api/reports/tasks-by-project`).then((res) => res.json()),
          fetch(`${API_URL}/api/reports/kanban-overview`).then((res) => res.json()),
          fetch(`${API_URL}/api/reports/employee-time-tracking`).then((res) => res.json()),
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
      const dateStr = item.Task_Date || item.Start_Date || item.End_Date || item.Deadline;
      if (!dateStr) return false;
      const date = dayjs(dateStr);
      return date.isAfter(start.startOf("day")) && date.isBefore(end.endOf("day"));
    });
  };

  const buildFilterMenu = (
    setRange: (range: [Dayjs, Dayjs] | null) => void
  ): React.ReactElement => (
    <div style={{ padding: 8 }}>
      <Button block onClick={() => setRange([dayjs().startOf("day"), dayjs().endOf("day")])}>
        Сегодня
      </Button>
      <Button block onClick={() => setRange([dayjs().startOf("week"), dayjs().endOf("week")])}>
        Неделя
      </Button>
      <Button block onClick={() => setRange([dayjs().startOf("month"), dayjs().endOf("month")])}>
        Месяц
      </Button>
      <Button block onClick={() => setRange([dayjs().startOf("year"), dayjs().endOf("year")])}>
        Год
      </Button>
      <RangePicker
        style={{ marginTop: 8, width: "100%" }}
        onChange={(dates) => {
          if (dates && dates[0] && dates[1]) {
            setRange([dates[0] as Dayjs, dates[1] as Dayjs]);
          }
        }}
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
      title: "Сотрудник",
      dataIndex: "Employee_Name",
      key: "Employee_Name",
      align: "center",
    },
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
      legend: { labels: { color: "#ffffff" } },
    },
    scales: {
      x: {
        ticks: { color: "#ffffff" },
        grid: { color: "rgba(255, 255, 255, 0.2)" },
      },
      y: {
        ticks: { color: "#ffffff" },
        grid: { color: "rgba(255, 255, 255, 0.2)" },
      },
    },
  };

  const pieData = {
    labels: applyDateFilter(tasksByProjectType).map((item) => item.Project_Type),
    datasets: [
      {
        data: applyDateFilter(tasksByProjectType).map((item) => item.Task_Count),
        backgroundColor: [
          "#1976D2",
          "#26A69A",
          "#FFB300",
          "#66BB6A",
          "#EF5350",
          "#AB47BC",
        ],
        borderColor: "#ffffff",
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: applyDateFilter(tasksByEmployee).map((item) => item.Employee_Name),
    datasets: [
      {
        label: "Количество задач",
        data: applyDateFilter(tasksByEmployee).map((item) => item.Task_Count),
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

  const applySearchFilter = <T extends KanbanTask | TimeTrackingEntry>(data: T[]): T[] => {
    if (!searchText.trim()) return data;
    const lowerSearch = searchText.toLowerCase();
    return data.filter((item) => {
      const values = Object.values(item as Record<keyof T, unknown>);
      return values.some((value) => {
        if (typeof value === "string" || typeof value === "number") {
          return value.toString().toLowerCase().includes(lowerSearch);
        }
        return false;
      });
    });
  };

  const tabItems = [
    {
      key: "kanban",
      label: "Журнал задач на проекты",
      children: (
        <Table<KanbanTask>
          columns={kanbanColumns}
          dataSource={applySearchFilter(applyDateFilter(kanbanData))}
          rowKey="ID_Task"
          pagination={false}
        />
      ),
    },
    {
      key: "time-tracking",
      label: "Отчёт по отработанным часам",
      children: (
        <Table<TimeTrackingEntry>
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
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <div className="dashboard">
        <Header />
        <div className="dashboard-body">
          <SidebarManager />
          <main className="main-content">
            <h1>Отчёты по сотрудникам</h1>
            <Input
              placeholder="Поиск по всем данным..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ marginBottom: "16px", width: "300px" }}
            />
            <Tabs defaultActiveKey="kanban" items={tabItems} />

            <Divider>
              <span>Распределение задач по типу проекта</span>
              <Dropdown
                overlay={buildFilterMenu((range) => setDateRange(range))}
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
                padding: "20px 0",
              }}
            >
              <div style={{ width: "600px", height: "600px" }}>
                <Pie
                  data={pieData}
                  options={{ ...commonOptions, maintainAspectRatio: true }}
                />
              </div>
            </div>

            <Divider>
              <span>Количество задач по сотрудникам</span>
              <Dropdown
                overlay={buildFilterMenu((range) => setDateRange(range))}
                trigger={["click"]}
              >
                <Button icon={<FilterOutlined />} style={{ marginLeft: 8 }} />
              </Dropdown>
            </Divider>
            <Bar data={barData} options={commonOptions} />

            <Divider>
              <span>Количество задач по проектам по датам</span>
              <Dropdown
                overlay={buildFilterMenu((range) => setDateRange(range))}
                trigger={["click"]}
              >
                <Button icon={<FilterOutlined />} style={{ marginLeft: 8 }} />
              </Dropdown>
            </Divider>
            <Line data={lineData} options={commonOptions} />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ManagerReportsPage;