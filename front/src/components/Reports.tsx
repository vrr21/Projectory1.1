import React, { useEffect, useState } from 'react';
import { Card, Typography, Button, App, Table } from 'antd';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../contexts/useAuth';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const { Title: AntTitle } = Typography;
const API_URL = import.meta.env.VITE_API_URL;

interface ReportItem {
  Month: string;
  Year: string;
  Time_Norm: number;
  Employee_Name: string;
  Hours_Spent: number;
  Status_Name: string;
  Order_Name: string;
  Project_Type: string;
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const { message } = App.useApp();

  useEffect(() => {
    const fetchReports = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`${API_URL}/api/reports/employee/${user.id}`);
        if (!res.ok) throw new Error('Ошибка при загрузке отчета');
        const data = await res.json();
        setReportData(data);
      } catch (error) {
        console.error('Ошибка при загрузке данных отчета:', error);
        message.error('Ошибка при загрузке данных отчета');
      }
    };
    fetchReports();
  }, [user]);

  const exportToWord = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reports/export-word/${user?.id}`);
      if (!response.ok) throw new Error('Ошибка при экспорте отчета');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'employee-report.docx';
      link.click();
    } catch (error) {
      console.error('Ошибка при экспорте отчета:', error);
      message.error('Ошибка при экспорте отчета');
    }
  };

  const lineChartData = {
    labels: reportData.map(item => `${item.Month}.${item.Year}`),
    datasets: [{
      label: 'Норма времени (часов)',
      data: reportData.map(item => item.Time_Norm),
      borderColor: '#36a2eb',
      fill: false,
    }],
  };

  const employeeNames = [...new Set(reportData.map(item => item.Employee_Name))];
  const barChartData = {
    labels: employeeNames,
    datasets: [{
      label: 'Часы на задачи',
      data: employeeNames.map(name =>
        reportData.filter(i => i.Employee_Name === name).reduce((sum, i) => sum + i.Hours_Spent, 0)
      ),
      backgroundColor: '#ffcd56',
    }],
  };

  const statusNames = [...new Set(reportData.map(item => item.Status_Name))];
  const doughnutChartData = {
    labels: statusNames,
    datasets: [{
      label: 'Задачи по статусу',
      data: statusNames.map(status =>
        reportData.filter(i => i.Status_Name === status).length
      ),
      backgroundColor: ['#4bc0c0', '#59AC78', '#36a2eb', '#9966ff'],
    }],
  };

  const chartOptions = {
    plugins: { legend: { labels: { color: '#fff' } } },
    scales: {
      x: { ticks: { color: '#ddd' }, grid: { color: 'rgba(255,255,255,0.2)' } },
      y: { ticks: { color: '#ddd' }, grid: { color: 'rgba(255,255,255,0.2)' } }
    }
  };

  return (
    <div className="reports">
      <AntTitle level={3}>Отчёты по задачам</AntTitle>

      <Card title="Задачи по месяцам" variant="outlined">
        <Table
          dataSource={reportData.map((r, i) => ({ ...r, key: i }))}
          columns={[
            { title: 'Проект', dataIndex: 'Order_Name' },
            { title: 'Тип проекта', dataIndex: 'Project_Type' },
            { title: 'Месяц', render: (_, record) => `${record.Month}.${record.Year}` },
            { title: 'Норма времени (ч)', dataIndex: 'Time_Norm' },
          ]}
          pagination={false}
        />
        <Line data={lineChartData} options={chartOptions} />
      </Card>

      <Card title="Задачи по сотрудникам" variant="outlined">
        <Table
          dataSource={employeeNames.map((name, i) => ({
            key: i,
            Employee_Name: name,
            Hours_Spent: reportData
              .filter(item => item.Employee_Name === name)
              .reduce((sum, i) => sum + i.Hours_Spent, 0)
          }))}
          columns={[
            { title: 'Сотрудник', dataIndex: 'Employee_Name' },
            { title: 'Всего часов', dataIndex: 'Hours_Spent' }
          ]}
          pagination={false}
        />
        <Bar data={barChartData} options={chartOptions} />
      </Card>

      <Card title="Задачи по статусам" variant="outlined">
        <Table
          dataSource={statusNames.map((status, i) => ({
            key: i,
            Status_Name: status,
            Count: reportData.filter(item => item.Status_Name === status).length
          }))}
          columns={[
            { title: 'Статус', dataIndex: 'Status_Name' },
            { title: 'Количество задач', dataIndex: 'Count' }
          ]}
          pagination={false}
        />
        <Doughnut data={doughnutChartData} options={chartOptions} />
      </Card>

      <Button type="primary" onClick={exportToWord} className="export-button">
        Экспортировать в Word
      </Button>
    </div>
  );
};

export default Reports;
