const { pool } = require('../config/db');

async function getUserByEmail(email) {
  try {
    const result = await pool.request()
      .input('email', email)
      .query('SELECT * FROM Users WHERE Email = @email');
    return result.recordset[0];
  } catch (error) {
    console.error('Ошибка при получении пользователя по email:', error);
    throw error;
  }
}

async function createUser({ firstName, lastName, phone, email, password, roleId }) {
  try {
    await pool.request()
      .input('firstName', firstName)
      .input('lastName', lastName)
      .input('phone', phone)
      .input('email', email)
      .input('password', password)
      .input('roleId', roleId)
      .query(`
        INSERT INTO Users (First_Name, Last_Name, Phone, Email, Password, ID_Role)
        VALUES (@firstName, @lastName, @phone, @email, @password, @roleId)
      `);
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    throw error;
  }
}

module.exports = {
  getUserByEmail,
  createUser,
};
