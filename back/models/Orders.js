// backend/models/Orders.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');  // Подключаем подключение к базе данных

const Orders = sequelize.define('Orders', {
  ID_Order: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Order_Name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Добавьте другие поля для модели Orders, если необходимо
});

module.exports = Orders;
