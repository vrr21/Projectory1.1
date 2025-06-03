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
        u.Archived,
        -- Роли
        ISNULL(
          (
            SELECT STRING_AGG(
              ISNULL(tm2.Role, r.Role_Name), ', '
            )
            FROM TeamMembers tm2
            LEFT JOIN Roles r ON u.ID_Role = r.ID_Role
            WHERE tm2.ID_User = u.ID_User OR u.ID_User = u.ID_User
          ), r.Role_Name
        ) AS Roles,
        -- Остальное без изменений...
        ISNULL((
          SELECT STRING_AGG(T.Team_Name, ', ')
          FROM TeamMembers TM
          JOIN Teams T ON TM.ID_Team = T.ID_Team
          WHERE TM.ID_User = u.ID_User
        ), '–') AS Teams,
        ISNULL((
          SELECT STRING_AGG(O.Order_Name, ', ')
          FROM Orders O
          WHERE EXISTS (
            SELECT 1
            FROM Teams T
            JOIN TeamMembers TM ON T.ID_Team = TM.ID_Team
            WHERE T.ID_Team = O.ID_Team AND TM.ID_User = u.ID_User
          )
        ), '–') AS Projects,
        ISNULL((
          SELECT STRING_AGG(TK.Task_Name, ', ')
          FROM Assignment A
          JOIN Tasks TK ON A.ID_Task = TK.ID_Task
          WHERE A.ID_Employee = u.ID_User
        ), '–') AS Tasks
      FROM Users u
      LEFT JOIN Roles r ON u.ID_Role = r.ID_Role
    `);
    

    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении расширенных данных сотрудников:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении сотрудников' });
  }
};
