// models/user.model.js

const { pool, sql } = require('../config/db');

// Получение пользователя по email
async function getUserByEmail(email) {
  const result = await pool.request()
    .input('email', sql.NVarChar, email)
    .query('SELECT * FROM Users WHERE Email = @email');
  return result.recordset[0]; // Возвращаем первого пользователя
}

// Создание нового пользователя
async function createUser({ firstName, lastName, phone, email, password, roleId }) {
  await pool.request()
    .input('firstName', sql.NVarChar, firstName)
    .input('lastName', sql.NVarChar, lastName)
    .input('phone', sql.NVarChar, phone)
    .input('email', sql.NVarChar, email)
    .input('password', sql.NVarChar, password)
    .input('roleId', sql.Int, roleId)
    .query(`
      INSERT INTO Users (First_Name, Last_Name, Phone, Email, Password, ID_Role)
      VALUES (@firstName, @lastName, @phone, @email, @password, @roleId)
    `);
}

module.exports = {
  getUserByEmail,
  createUser,
};
