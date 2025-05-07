import React, { useEffect, useState } from 'react';

import { Card, Typography, Button, App, Table, Dropdown } from 'antd';
import {  Doughnut, Line } from 'react-chartjs-2';
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { DownloadOutlined } from '@ant-design/icons';

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
  }, [user, message]);

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

  const exportToPDF = async () => {
    const reportElement = document.querySelector('.reports');
    if (!reportElement) return;

    try {
      const canvas = await html2canvas(reportElement as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('employee-report.pdf');
    } catch (error) {
      console.error('Ошибка при экспорте в PDF:', error);
      message.error('Ошибка при экспорте в PDF');
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'employee-report.xlsx');
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


  const statusMap = new Map<string, number>();

  reportData.forEach(item => {
    const raw = item.Status_Name || '';
    const status = raw.trim().toLowerCase(); // нормализация
    if (!status) return;
    const existing = statusMap.get(status) || 0;
    statusMap.set(status, existing + 1);
  });
  
  // Уникальные статусы по исходному отображаемому виду (без потери читаемости)
  const statusLabelsMap = new Map<string, string>();
  reportData.forEach(item => {
    const raw = item.Status_Name || '';
    const normalized = raw.trim().toLowerCase();
    if (normalized && !statusLabelsMap.has(normalized)) {
      statusLabelsMap.set(normalized, raw.trim()); // оригинальное имя
    }
  });
  
  const statusNames = Array.from(statusMap.keys()).map(k => statusLabelsMap.get(k) || k);
  const statusCounts = Array.from(statusMap.values());
  
  const doughnutChartData = {
    labels: statusNames,
    datasets: [{
      label: 'Задачи по статусу',
      data: statusCounts,
      backgroundColor: ['#4bc0c0', '#59AC78', '#36a2eb', '#9966ff', '#ff6384', '#ffa600'],
      borderColor: '#1e1e1e',
      borderWidth: 1,
    }],
  };
  

  const chartOptions = {
    plugins: {
      legend: {
        labels: {
          color: '#ffffff',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#ffffff' },
        grid: {
          color: '#ffffff',
          lineWidth: 0.3,
        },
      },
      y: {
        ticks: { color: '#ffffff' },
        grid: {
          color: '#ffffff',
          lineWidth: 0.3, 
        },
      },
    },
  };

  const exportMenuItems = [
    {
      key: 'excel',
      label: 'Экспорт в Excel',
      onClick: exportToExcel,
    },
    {
      key: 'pdf',
      label: 'Экспорт в PDF',
      onClick: exportToPDF,
    },
    {
      key: 'word',
      label: 'Экспорт в Word',
      onClick: exportToWord,
    },
  ];

  return (
    <div className="reports">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AntTitle level={3} style={{ margin: 0 }}>Отчёты по задачам</AntTitle>
        <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight" trigger={['click']}>
          <Button icon={<DownloadOutlined />} />
        </Dropdown>
      </div>

      <Card title="Задачи по месяцам" style={{ marginTop: 16 }}>
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

    
      <Card title="Задачи по статусам" style={{ marginTop: 16 }}>
      <Table
  dataSource={statusNames.map((label, i) => ({
    key: i,
    Status_Name: label,
    Count: statusCounts[i]
  }))}
  columns={[
    { title: 'Статус', dataIndex: 'Status_Name' },
    { title: 'Количество задач', dataIndex: 'Count' }
  ]}
  pagination={false}
/>

        <Doughnut data={doughnutChartData} options={chartOptions} />
      </Card>
    </div>
  );
};

export default Reports;
