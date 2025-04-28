import React from 'react';
import { useParams } from 'react-router-dom';

const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Детали проекта</h1>
      <p>Идентификатор проекта: {id}</p>
      {/* Тут позже подключишь запрос данных проекта */}
    </div>
  );
};

export default ProjectDetailsPage;
