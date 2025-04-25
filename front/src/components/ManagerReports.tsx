
import React, { useEffect, useState } from 'react';
import { Card, Typography, Button, Table, message } from 'antd';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
// @ts-ignore
import { saveAs } from 'file-saver';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  ChartTitle,
  Tooltip,
  Legend
);

const { Title } = Typography;
const API_URL = import.meta.env.VITE_API_URL;

interface Report {
  Project_Type: string;
  Order_Name: string;
  Task_Name: string;
  Status_Name: string;
  Employee_Name: string;
  Time_Norm: number;
  Start_Date: string | null;
  End_Date: string | null;
  Hours_Spent: number | null;
  Year: number;
  Month: number;
  ID_Task: number;
}

const ManagerReports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/reports/all`);
        if (!res.ok) throw new Error('Ошибка при загрузке отчётов');
        const data: Report[] = await res.json();
        setReports(data);
      } catch (error) {
        console.error('Ошибка при загрузке отчётов:', error);
        message.error('Не удалось загрузить отчёты');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);


  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reports);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Manager Reports');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'manager-reports.xlsx');
  };

  const exportToPDF = async () => {
    const reportElement = document.querySelector('.manager-reports');
    if (!reportElement) return;

    const canvas = await html2canvas(reportElement as HTMLElement, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const ratio = canvas.width / canvas.height;
    const pdfHeight = pdfWidth / ratio;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('manager-reports.pdf');
  };

  const lineData = {
    labels: reports.map(r => `${r.Month}.${r.Year}`),
    datasets: [{
      label: 'Норма времени',
      data: reports.map(r => r.Time_Norm),
      borderColor: '#36a2eb',
      fill: false,
    }]
  };

  const employeeNames = [...new Set(reports.map(r => r.Employee_Name))];
  const barData = {
    labels: employeeNames,
    datasets: [{
      label: 'Часы потрачено',
      data: employeeNames.map(name =>
        reports.filter(r => r.Employee_Name === name).reduce((acc, r) => acc + (r.Hours_Spent || 0), 0)
      ),
      backgroundColor: '#ffcd56'
    }]
  };

  const statusCounts = [...new Set(reports.map(r => r.Status_Name))].map(status => ({
    status,
    count: reports.filter(r => r.Status_Name === status).length
  }));

  const doughnutData = {
    labels: statusCounts.map(s => s.status),
    datasets: [{
      label: 'Задачи по статусу',
      data: statusCounts.map(s => s.count),
      backgroundColor: ['#4bc0c0', '#59AC78', '#36a2eb', '#9966ff']
    }]
  };

  const columns = [
    { title: 'Сотрудник', dataIndex: 'Employee_Name', key: 'Employee_Name' },
    { title: 'Проект', dataIndex: 'Order_Name', key: 'Order_Name' },
    { title: 'Тип проекта', dataIndex: 'Project_Type', key: 'Project_Type' },
    { title: 'Задача', dataIndex: 'Task_Name', key: 'Task_Name' },
    { title: 'Норма времени', dataIndex: 'Time_Norm', key: 'Time_Norm' },
    { title: 'Статус', dataIndex: 'Status_Name', key: 'Status_Name' },
    {
      title: 'Дата начала',
      dataIndex: 'Start_Date',
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : '—'
    },
    {
      title: 'Дата окончания',
      dataIndex: 'End_Date',
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : '—'
    },
    {
      title: 'Часы потрачено',
      dataIndex: 'Hours_Spent',
      render: (val: number | null) => val !== null ? val : '—'
    },
    { title: 'Год', dataIndex: 'Year', key: 'Year' },
    { title: 'Месяц', dataIndex: 'Month', key: 'Month' },
  ];

  return (
    <div className="manager-reports">
      <Title level={3}>Отчёты по всем задачам</Title>

      <Card title="Таблица отчётов" style={{ marginBottom: 24 }}>
        <Table
          dataSource={reports}
          columns={columns}
          rowKey="ID_Task"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Card title="Норма времени по месяцам" style={{ marginBottom: 24 }}>
        <Line data={lineData} />
      </Card>

      <Card title="Часы по сотрудникам" style={{ marginBottom: 24 }}>
        <Bar data={barData} />
      </Card>

      <Card title="Распределение по статусам задач">
        <Doughnut data={doughnutData} />
      </Card>

      <div style={{ marginTop: 24 }}>
        <Button onClick={exportToExcel} type="default">Экспорт в Excel</Button>
        <Button onClick={exportToPDF} style={{ marginLeft: 12 }}>Экспорт в PDF</Button>
      </div>
    </div>
  );
};

export default ManagerReports;
