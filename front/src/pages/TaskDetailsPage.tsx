import React from 'react';
import { useParams } from 'react-router-dom';

const TaskDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Детали задачи</h1>
      <p>Идентификатор задачи: {id}</p>
      {/* Здесь сделаешь запрос к API и отобразишь данные */}
    </div>
  );
};

export default TaskDetailsPage;
