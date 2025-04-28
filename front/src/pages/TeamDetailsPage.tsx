import React from 'react';
import { useParams } from 'react-router-dom';

const TeamDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Детали команды</h1>
      <p>Идентификатор команды: {id}</p>
      {/* Тут позже подключишь запрос данных команды */}
    </div>
  );
};

export default TeamDetailsPage;
