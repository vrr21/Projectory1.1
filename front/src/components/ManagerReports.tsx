import React, { useEffect, useState } from 'react';
import { Card, Typography, Button, Table, message, Dropdown } from 'antd';
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
import { saveAs } from 'file-saver';
import { DownloadOutlined } from '@ant-design/icons';
import {
  Document,
  Packer,
  Paragraph,
  Table as DocxTable,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
} from 'docx';

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

const chartOptions = {
  plugins: {
    legend: { labels: { color: '#000' } },
  },
  scales: {
    x: {
      ticks: { color: '#000' },
      grid: { color: 'rgba(0,0,0,0.1)' },
    },
    y: {
      ticks: { color: '#000' },
      grid: { color: 'rgba(0,0,0,0.1)' },
    },
  },
};

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
        console.log('Полученные данные:', data); 
        setReports(data);
      } catch (error) {
        console.error(error);
        message.error('Не удалось загрузить отчёты');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);
  

  const exportToWord = async () => {
    const tableRows = [
      new TableRow({
        children: [
          'Сотрудник', 'Проект', 'Тип проекта', 'Задача', 'Норма времени', 'Статус',
          'Дата начала', 'Дата окончания', 'Часы потрачено', 'Год', 'Месяц'
        ].map(text => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
          width: { size: 10, type: WidthType.PERCENTAGE }
        }))
      }),
      ...reports.map(r => new TableRow({
        children: [
          r.Employee_Name, r.Order_Name, r.Project_Type, r.Task_Name, r.Time_Norm.toString(), r.Status_Name,
          r.Start_Date ? new Date(r.Start_Date).toLocaleDateString() : '—',
          r.End_Date ? new Date(r.End_Date).toLocaleDateString() : '—',
          r.Hours_Spent !== null ? r.Hours_Spent.toString() : '—',
          r.Year.toString(), r.Month.toString(),
        ].map(text => new TableCell({
          children: [new Paragraph({ children: [new TextRun(text)] })],
          width: { size: 10, type: WidthType.PERCENTAGE }
        }))
      }))
    ];

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Отчёт по задачам',
              heading: 'Heading1',
              spacing: { after: 300 }
            }),
            new DocxTable({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE }
            }),
          ]
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'manager-report.docx');
  };

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
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let position = 0;
    let heightLeft = imgHeight;

    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();

    while (heightLeft > 0) {
      position -= pdf.internal.pageSize.getHeight();
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
    }

    pdf.save('manager-reports.pdf');
  };

  const employeeMap = new Map<string, number>();
  reports.forEach(r => {
    if (r.Employee_Name && typeof r.Hours_Spent === 'number') {
      employeeMap.set(r.Employee_Name, (employeeMap.get(r.Employee_Name) || 0) + r.Hours_Spent);
    }
  });

  const barLabels = Array.from(employeeMap.keys());
  const barData = {
    labels: barLabels,
    datasets: [{
      label: 'Часы потрачено',
      data: barLabels.map(name => employeeMap.get(name) || 0),
      backgroundColor: '#ffcd56'
    }]
  };

  const monthlyDataMap = new Map<string, number>();
  reports.forEach(r => {
    const key = `${r.Month}.${r.Year}`;
    monthlyDataMap.set(key, (monthlyDataMap.get(key) || 0) + r.Time_Norm);
  });
  const lineLabels = Array.from(monthlyDataMap.keys()).sort((a, b) => {
    const [ma, ya] = a.split('.').map(Number);
    const [mb, yb] = b.split('.').map(Number);
    return ya !== yb ? ya - yb : ma - mb;
  });
  const lineData = {
    labels: lineLabels,
    datasets: [{
      label: 'Норма времени (ч)',
      data: lineLabels.map(label => monthlyDataMap.get(label) || 0),
      borderColor: '#36a2eb',
      fill: false,
    }]
  };
  

  const statusMap = new Map<string, number>();
  reports.forEach(r => {
    if (r.Status_Name) {
      statusMap.set(r.Status_Name, (statusMap.get(r.Status_Name) || 0) + 1);
    }
  });
  const doughnutLabels = Array.from(statusMap.keys());
  const doughnutData = {
    labels: doughnutLabels,
    datasets: [{
      label: 'Задачи по статусу',
      data: doughnutLabels.map(status => statusMap.get(status) || 0),
      backgroundColor: ['#4bc0c0', '#59AC78', '#36a2eb', '#9966ff'],
      borderColor: '#555',
      borderWidth: 1
    }]
  };

  const exportMenuItems = [
    { key: 'excel', label: 'Экспорт в Excel', onClick: exportToExcel },
    { key: 'pdf', label: 'Экспорт в PDF', onClick: exportToPDF },
    { key: 'word', label: 'Экспорт в Word', onClick: exportToWord }
  ];

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
      render: (date: string | null) =>
        date ? new Date(date).toLocaleDateString() : '—'
    },
    {
      title: 'Дата окончания',
      dataIndex: 'End_Date',
      render: (date: string | null) =>
        date ? new Date(date).toLocaleDateString() : '—'
    },
    {
      title: 'Часы потрачено',
      dataIndex: 'Hours_Spent',
      render: (val: number | null) => (val !== null ? val : '—')
    },
    { title: 'Год', dataIndex: 'Year', key: 'Year' },
    { title: 'Месяц', dataIndex: 'Month', key: 'Month' }
  ];
  

  return (
    <div className="manager-reports">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Title level={3}>Отчёты по всем задачам</Title>
        <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
          <Button icon={<DownloadOutlined />} />
        </Dropdown>
      </div>

      <Card title="Таблица отчётов" style={{ marginBottom: 24 }}>
        <Table
          dataSource={reports}
          columns={columns}
          rowKey="ID_Task"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Card title="Норма времени по месяцам" style={{ marginBottom: 24 }}>
        <Line data={lineData} options={chartOptions} />
      </Card>

      <Card title="Часы по сотрудникам (таблица)" style={{ marginBottom: 12 }}>
        <Table
          dataSource={barLabels.map(name => ({
            key: name,
            name,
            hours: employeeMap.get(name) || 0
          }))}
          columns={[
            { title: 'Сотрудник', dataIndex: 'name', key: 'name' },
            { title: 'Часы потрачено', dataIndex: 'hours', key: 'hours' }
          ]}
          pagination={false}
        />
      </Card>

      <Card title="Часы по сотрудникам" style={{ marginBottom: 24 }}>
        <Bar data={barData} options={chartOptions} />
      </Card>

      <Card title="Распределение по статусам задач">
        <Doughnut data={doughnutData} options={chartOptions} />
      </Card>
    </div>
  );
};

export default ManagerReports;
