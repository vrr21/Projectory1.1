import React, { useEffect, useState } from 'react';
import { Layout, Card, Spin, Typography, Progress } from 'antd';
import { Pie, Bar } from '@ant-design/plots';
import HeaderManager from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import LineChart from '../components/LineChart';
import '../styles/pages/PageManagerReports.css';

const { Content } = Layout;
const { Title } = Typography;
const API_URL = import.meta.env.VITE_API_URL;

interface EmployeeHoursReport {
  Employee_Name: string;
  Total_Hours: number;
}

interface LineDatum {
  date: string;
  tasks: number;
}

interface TaskStatusSummary {
  Status_Name: string;
  Task_Count: number;
}

interface LineOrder {
  Creation_Date: string;
  Total_Tasks: number;
}

const PageManagerReports: React.FC = () => {
  const [hours, setHours] = useState<EmployeeHoursReport[]>([]);
  const [statusSummary, setStatusSummary] = useState<TaskStatusSummary[]>([]);
  const [lineOrders, setLineOrders] = useState<LineOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [hoursRes, statusRes, lineDataRes] = await Promise.all([
          fetch(`${API_URL}/api/reportspage/hours`, { headers }),
          fetch(`${API_URL}/api/reportspage/task-status-summary`, { headers }),
          fetch(`${API_URL}/api/reportspage/orders`, { headers }),
        ]);

        const [hoursData, statusData, lineDataJson] = await Promise.all([
          hoursRes.json(),
          statusRes.json(),
          lineDataRes.json(),
        ]);

        setHours(Array.isArray(hoursData) ? hoursData : []);
        setStatusSummary(Array.isArray(statusData) ? statusData : []);
        setLineOrders(Array.isArray(lineDataJson) ? lineDataJson : []);
      } catch (error) {
        console.error('Ошибка при загрузке данных', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalTasks = lineOrders.reduce((sum, o) => sum + (o.Total_Tasks ?? 0), 0);
  const completedTasks = Math.floor(totalTasks * 0.6); // placeholder

  const themeOverrides = {
    styleSheet: {
      brandColor: '#5B8FF9',
      backgroundColor: '#2c2c2c',
      textColor: '#ffffff',
      labelFill: '#ffffff',
      axisLineColor: '#ffffff',
      axisTickLineColor: '#ffffff',
      axisLabelFill: '#ffffff',
      legendTextFillColor: '#ffffff',
      tooltipBackgroundColor: '#2c2c2c',
      tooltipTextColor: '#ffffff',
      fontFamily: 'Arial',
    },
  };

  const pieData: EmployeeHoursReport[] = hours.filter(
    (item): item is EmployeeHoursReport =>
      typeof item.Employee_Name === 'string' &&
      item.Employee_Name.trim().length > 0 &&
      typeof item.Total_Hours === 'number' &&
      !isNaN(item.Total_Hours) &&
      item.Total_Hours > 0
  );

  const pieConfig = {
    appendPadding: 10,
    data: pieData,
    angleField: 'Total_Hours',
    colorField: 'Employee_Name',
    radius: 1,
    label: {
      type: 'inner',
      offset: '-30%',
      content: (data: EmployeeHoursReport) =>
        `${data.Employee_Name}\n${data.Total_Hours} ч`,
      style: {
        fill: '#ffffff',
        fontSize: 12,
        textAlign: 'center',
        fontWeight: 'bold',
      },
    },
    interactions: [
      { type: 'element-selected' },
      { type: 'element-active' },
    ],
    legend: {
      position: 'bottom',
      itemName: {
        style: {
          fill: '#ffffff',
          fontSize: 12,
        },
      },
    },
    tooltip: {
      fields: ['Employee_Name', 'Total_Hours'],
      formatter: (datum: EmployeeHoursReport) => ({
        name: datum.Employee_Name,
        value: `${datum.Total_Hours} ч`,
      }),
    },
    theme: themeOverrides,
  };

  const barConfig = {
    data: statusSummary
      .filter(item => typeof item.Task_Count === 'number' && !isNaN(item.Task_Count))
      .map(item => ({
        Status_Name: item.Status_Name || 'Неизвестно',
        Task_Count: item.Task_Count ?? 0,
      })),
    xField: 'Task_Count',
    yField: 'Status_Name',
    label: {
      position: 'right',
      style: { fill: '#ffffff', fontSize: 12 },
    },
    xAxis: {
      label: { style: { fill: '#ffffff', fontSize: 12 } },
      line: { style: { stroke: '#ffffff' } },
      tickLine: { style: { stroke: '#ffffff' } },
      grid: { line: { style: { stroke: '#444444', lineDash: [4, 4] } } },
    },
    yAxis: {
      label: { style: { fill: '#ffffff', fontSize: 12 } },
      line: { style: { stroke: '#ffffff' } },
      tickLine: { style: { stroke: '#ffffff' } },
    },
    theme: themeOverrides,
  };

  const lineData: LineDatum[] = lineOrders
    .filter(
      (order): order is LineOrder =>
        !!order?.Creation_Date &&
        typeof order.Total_Tasks === 'number' &&
        !isNaN(order.Total_Tasks)
    )
    .map(order => ({
      date: new Date(order.Creation_Date).toLocaleDateString('ru-RU'),
      tasks: order.Total_Tasks,
    }));

  return (
    <Layout className="layout">
      <SidebarManager />
      <Layout className="inner-layout">
        <HeaderManager />
        <Content className="page-content reports-page">
          <Title level={2}>Отчёты менеджера</Title>
          {loading ? (
            <Spin size="large" />
          ) : (
            <>
              <Card title="Выполненные задачи (процент выполнения)" className="card">
                <Progress
                  type="circle"
                  percent={totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}
                  format={(percent?: number) => `${percent ?? 0}%`}
                  strokeColor="#5B8FF9"
                />
              </Card>

              <Card title="Потраченные часы по сотрудникам" className="card">
                <Pie {...pieConfig} />
              </Card>

              <Card title="Задачи по статусам (гистограмма)" className="card">
                <Bar {...barConfig} />
              </Card>

              <Card title="Число задач по дате создания (график)" className="card">
                {lineData.length > 0 ? (
                  <LineChart data={lineData} />
                ) : (
                  <Typography.Text>Нет данных для отображения графика.</Typography.Text>
                )}
              </Card>
            </>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default PageManagerReports;
