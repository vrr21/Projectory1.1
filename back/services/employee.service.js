// back/services/employee.service.js

const { pool, sql } = require('../config/db');

// Функция для проверки существования сотрудников
const checkEmployeesExist = async (EmployeeIds) => {
    const employeeIdsString = EmployeeIds.join(',');
    const query = `SELECT ID_User FROM Users WHERE ID_User IN (${employeeIdsString})`;
    const result = await pool.request().query(query);
  
    const validEmployeeIds = result.recordset.map(row => row.ID_User);
    const invalidEmployeeIds = EmployeeIds.filter(id => !validEmployeeIds.includes(id));
  
    if (invalidEmployeeIds.length > 0) {
      console.log("Не найдены следующие сотрудники:", invalidEmployeeIds); // Логирование
      throw new Error(`Некоторые сотрудники не найдены: ${invalidEmployeeIds.join(", ")}`);
    }
  
    return { message: "Все сотрудники существуют" };
  };
  

module.exports = { checkEmployeesExist };
