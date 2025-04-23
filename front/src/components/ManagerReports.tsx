import React, { useEffect, useState } from 'react';
import { Table, message, Typography } from 'antd';

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
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/reports/all`);
        if (!res.ok) throw new Error('Ошибка при загрузке отчётов');
        const data: Report[] = await res.json();
        console.log('Данные отчётов:', data); // ✅ Проверка, что приходят данные
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
      key: 'Start_Date',
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : '—',
    },
    {
      title: 'Дата окончания',
      dataIndex: 'End_Date',
      key: 'End_Date',
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : '—',
    },
    {
      title: 'Часы потрачено',
      dataIndex: 'Hours_Spent',
      key: 'Hours_Spent',
      render: (hours: number | null) => hours !== null ? hours : '—',
    },
    { title: 'Год', dataIndex: 'Year', key: 'Year' },
    { title: 'Месяц', dataIndex: 'Month', key: 'Month' },
  ];

  return (
    <div>
      <Title level={4}>Отчёты всех сотрудников</Title>
      <Table
        dataSource={reports}
        columns={columns}
        rowKey="ID_Task"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default ManagerReports;
