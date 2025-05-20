// back/controllers/employeesExtended.controller.js

const { pool, poolConnect, sql } = require('../config/db');

exports.getExtendedEmployees = async (req, res) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      SELECT 
        u.ID_User,
        u.First_Name,
        u.Last_Name,
        u.Email,
        u.Phone,
        u.Avatar,
        STRING_AGG(DISTINCT tm.Team_Name, ', ') AS Teams,
        STRING_AGG(DISTINCT o.Order_Name, ', ') AS Projects,
        STRING_AGG(DISTINCT t.Task_Name, ', ') AS Tasks,
        STRING_AGG(DISTINCT ISNULL(tm2.Role, r.Role_Name), ', ') AS Roles
      FROM Users u
      LEFT JOIN TeamMembers tm2 ON u.ID_User = tm2.ID_User
      LEFT JOIN Teams tm ON tm2.ID_Team = tm.ID_Team
      LEFT JOIN Orders o ON tm.ID_Team = o.ID_Team
      LEFT JOIN Tasks t ON o.ID_Order = t.ID_Order
      LEFT JOIN Assignment a ON t.ID_Task = a.ID_Task AND a.ID_Employee = u.ID_User
      LEFT JOIN Roles r ON u.ID_Role = r.ID_Role
      WHERE u.ID_Role != 1 -- исключить менеджеров
      GROUP BY 
        u.ID_User, u.First_Name, u.Last_Name, u.Email, u.Phone, u.Avatar
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении расширенных данных сотрудников:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении сотрудников' });
  }
};
