import React from 'react';
import { useParams } from 'react-router-dom';

const EmployeeProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Профиль сотрудника</h1>
      <p>Идентификатор сотрудника: {id}</p>
      {/* Тут позже подключишь запрос данных сотрудника */}
    </div>
  );
};

export default EmployeeProfilePage;
