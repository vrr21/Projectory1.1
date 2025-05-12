import React, { useEffect, useState } from 'react';
import { Layout, Card, Spin, Typography, Progress, Button, Dropdown, MenuProps } from 'antd';
import { Pie, Bar } from '@ant-design/plots';
import { DownloadOutlined } from '@ant-design/icons';
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
  TaskDate: string;
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

        setHours(Array.isArray(hoursData)
          ? hoursData.filter(h => typeof h.Employee_Name === 'string' && h.Employee_Name.trim() !== '' && typeof h.Total_Hours === 'number' && h.Total_Hours > 0)
          : []);

        setStatusSummary(Array.isArray(statusData)
          ? statusData.filter(s => typeof s.Status_Name === 'string' && s.Status_Name.trim() !== '' && typeof s.Task_Count === 'number' && s.Task_Count > 0)
          : []);

        setLineOrders(Array.isArray(lineDataJson)
          ? lineDataJson.filter(o => typeof o.TaskDate === 'string' && o.TaskDate.trim() !== '' && typeof o.Total_Tasks === 'number' && o.Total_Tasks > 0)
          : []);

      } catch (error) {
        console.error('Ошибка при загрузке данных', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleExportReports = async (format: 'word' | 'excel' | 'pdf') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/export/reports?format=${format}`, { headers: { Authorization: `Bearer ${token}` } });

      if (!res.ok) throw new Error('Ошибка при экспорте');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reports.${format === 'word' ? 'docx' : format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Ошибка при экспорте отчётов', error);
    }
  };

  const exportMenu: MenuProps = {
    onClick: ({ key }) => handleExportReports(key as 'word' | 'excel' | 'pdf'),
    items: [
      { key: 'word', label: 'Экспорт в Word (.docx)' },
      { key: 'excel', label: 'Экспорт в Excel (.xlsx)' },
      { key: 'pdf', label: 'Экспорт в PDF (.pdf)' },
    ],
  };

  const totalTasks = lineOrders.reduce((sum, o) => sum + o.Total_Tasks, 0);
  const completedTasks = Math.floor(totalTasks * 0.6);

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

  const pieData = hours;
  const barData = statusSummary.map(s => ({ Status_Name: s.Status_Name, Task_Count: s.Task_Count }));
  const lineData: LineDatum[] = lineOrders
    .filter(o => o.TaskDate && o.Total_Tasks > 0)
    .map(o => ({ date: new Date(o.TaskDate).toLocaleDateString('ru-RU'), tasks: o.Total_Tasks }));

  const pieConfig = {
    appendPadding: 10,
    data: pieData,
    angleField: 'Total_Hours',
    colorField: 'Employee_Name',
    radius: 1,
    label: {
      position: 'inside',
      content: (data: EmployeeHoursReport) => `${data.Employee_Name}\n${data.Total_Hours} ч`,
      style: { fill: '#ffffff', fontSize: 12, textAlign: 'center', fontWeight: 'bold' },
    },
    interactions: [{ type: 'element-selected' }, { type: 'element-active' }],
    legend: { position: 'bottom', itemName: { style: { fill: '#ffffff', fontSize: 12 } } },
    tooltip: {
      fields: ['Employee_Name', 'Total_Hours'],
      formatter: (datum: EmployeeHoursReport) => ({
        name: datum.Employee_Name || 'Неизвестно',
        value: datum.Total_Hours != null ? `${datum.Total_Hours} ч` : 'Нет данных',
      }),
    },
    theme: themeOverrides,
  };

  const barConfig = {
    data: barData,
    xField: 'Task_Count',
    yField: 'Status_Name',
    label: { position: 'right', style: { fill: '#ffffff', fontSize: 12 } },
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

  return (
    <Layout className="layout">
      <SidebarManager />
      <Layout className="inner-layout">
        <HeaderManager />
        <Content className="page-content reports-page">
          <Title level={2}>Отчёты менеджера</Title>
          <Dropdown menu={exportMenu} placement="bottomRight" arrow>
            <Button icon={<DownloadOutlined />} style={{ marginBottom: 16 }}>
              Экспорт отчётов
            </Button>
          </Dropdown>
          {loading ? (
            <Spin size="large" />
          ) : (
            <>
              <Card title="Выполненные задач (процент выполнения)" className="card">
                <Progress
                  type="circle"
                  percent={totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}
                  format={(percent?: number) => `${percent ?? 0}%`}
                  strokeColor="#5B8FF9"
                  trailColor={document.documentElement.getAttribute('data-theme') === 'light' ? '#d9d9d9' : '#3a3a3a'}
                />
              </Card>

              <Card title="Потраченные часы по сотрудникам" className="card">
                {pieData.length > 0 ? <Pie {...pieConfig} /> : <Typography.Text>Нет данных для отображения.</Typography.Text>}
              </Card>

              <Card title="Задачи по статусам (гистограмма)" className="card">
                {barData.length > 0 ? <Bar {...barConfig} /> : <Typography.Text>Нет данных для отображения.</Typography.Text>}
              </Card>

              <Card title="Число задач по дате дедлайна (график)" className="card">
                {lineData.length > 0 ? <LineChart data={lineData} /> : <Typography.Text>Нет данных для отображения графика.</Typography.Text>}
              </Card>
            </>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default PageManagerReports;
