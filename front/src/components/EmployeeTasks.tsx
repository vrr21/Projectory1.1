import React, { useEffect, useState } from 'react';
import { fetchEmployeeTasks, Task } from '../api/tasks';

const EmployeeTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchEmployeeTasks();
        setTasks(data);
      } catch (error) {
        console.error('Ошибка при загрузке задач:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  if (loading) return <div>Загрузка задач...</div>;

  return (
    <div>
      <h2>Мои задачи</h2>
      <table>
        <thead>
          <tr>
            <th>Название задачи</th>
            <th>Описание</th>
            <th>Статус</th>
            <th>Проект</th>
            <th>Тип проекта</th>
            <th>Дата начала</th>
            <th>Дата окончания</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr key={task.ID_Task}>
              <td>{task.Task_Name}</td>
              <td>{task.Description}</td>
              <td>{task.Status_Name}</td>
              <td>{task.Order_Name}</td>
              <td>{task.ProjectType}</td>
              <td>{task.Start_Date || '—'}</td>
              <td>{task.End_Date || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeTasks;
