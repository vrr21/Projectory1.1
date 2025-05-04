// backend/models/Tasks.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');  // Подключаем подключение к базе данных

const Tasks = sequelize.define('Tasks', {
  ID_Task: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Task_Name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Time_Norm: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ID_Order: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Orders',
      key: 'ID_Order'
    }
  },
  ID_Status: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Statuses',
      key: 'ID_Status'
    }
  },
  // Добавьте другие поля для модели Tasks
});

module.exports = Tasks;
