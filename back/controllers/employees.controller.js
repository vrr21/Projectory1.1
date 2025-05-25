// back/controllers/employees.controller.js

const { pool, poolConnect, sql } = require('../config/db');

// Получить всех сотрудников (кроме менеджеров)
exports.getAllEmployees = async (req, res) => {
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
        STRING_AGG(DISTINCT t.Task_Name, ', ') AS Tasks
      FROM Users u
      LEFT JOIN TeamMembers m ON u.ID_User = m.ID_User
      LEFT JOIN Teams tm ON m.ID_Team = tm.ID_Team
      LEFT JOIN Assignment a ON u.ID_User = a.ID_Employee
      LEFT JOIN Tasks t ON a.ID_Task = t.ID_Task
      LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
      GROUP BY 
        u.ID_User, u.First_Name, u.Last_Name, u.Email, u.Phone, u.Avatar
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка при получении сотрудников:', err);
    res.status(500).json({ message: 'Ошибка при получении сотрудников' });
  }
};


// Поиск данных сотрудника (используется в поиске в шапке)
exports.fullSearchEmployeeData = async (req, res) => {
  const { q, employeeEmail } = req.query;

  if (!q || !employeeEmail) {
    return res.status(400).json({ message: 'Параметры поиска обязательны' });
  }

  try {
    await poolConnect;

    const result = await pool.request()
      .input('query', sql.NVarChar(255), `%${q}%`)
      .input('email', sql.NVarChar(255), employeeEmail)
      .query(`
        -- Поиск задач
        SELECT
          T.ID_Task AS id,
          T.Task_Name AS name,
          'task' AS type
        FROM Tasks T
        JOIN Assignment A ON T.ID_Task = A.ID_Task
        JOIN Users U ON A.ID_Employee = U.ID_User
        WHERE U.Email = @email AND T.Task_Name LIKE @query

        UNION ALL

        -- Поиск проектов через команды, в которых состоит сотрудник
        SELECT
          O.ID_Order AS id,
          O.Order_Name AS name,
          'order' AS type
        FROM Orders O
        JOIN Teams TM ON O.ID_Team = TM.ID_Team
        JOIN TeamMembers TMM ON TM.ID_Team = TMM.ID_Team
        JOIN Users U ON TMM.ID_User = U.ID_User
        WHERE U.Email = @email AND O.Order_Name LIKE @query

        UNION ALL

        -- Поиск команд
        SELECT
          TM.ID_Team AS id,
          TM.Team_Name AS name,
          'team' AS type
        FROM Teams TM
        JOIN TeamMembers TMM ON TM.ID_Team = TMM.ID_Team
        JOIN Users U ON TMM.ID_User = U.ID_User
        WHERE U.Email = @email AND TM.Team_Name LIKE @query
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка поиска данных сотрудника:', error);
    res.status(500).json({ message: 'Ошибка поиска данных сотрудника' });
  }
};

// Обновить профиль сотрудника
exports.updateEmployeeProfile = async (req, res) => {
  const { id, firstName, lastName, phone } = req.body;

  if (!id || !firstName || !lastName) {
    return res.status(400).json({ message: 'Некорректные данные' });
  }

  try {
    await poolConnect;
    await pool.request()
      .input('id', sql.Int, id)
      .input('firstName', sql.NVarChar(255), firstName)
      .input('lastName', sql.NVarChar(255), lastName)
      .input('phone', sql.NVarChar(50), phone || null)
      .query(`
        UPDATE Users
        SET First_Name = @firstName,
            Last_Name = @lastName,
            Phone = @phone
        WHERE ID_User = @id
      `);

    res.json({ message: 'Профиль успешно обновлён' });
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
    res.status(500).json({ message: 'Ошибка при обновлении профиля' });
  }
};


const path = require('path');
const multer = require('multer');

// Настройка хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Контроллер для загрузки аватара
exports.uploadAvatar = [
  upload.single('avatar'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    const { userId } = req.body;
    const filename = req.file.filename;

    try {
      await poolConnect;
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('avatar', sql.NVarChar(255), filename)
        .query(`
          UPDATE Users
          SET Avatar = @avatar
          WHERE ID_User = @userId
        `);

      res.json({ filename });
    } catch (error) {
      console.error('Ошибка при сохранении аватара:', error);
      res.status(500).json({ message: 'Ошибка при сохранении аватара' });
    }
  },
];

exports.getExtendedEmployeeList = async (req, res) => {
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
        STRING_AGG(tm.Role + ' (Команда: ' + t.Team_Name + ')', ', ') AS Roles
      FROM Users u
      LEFT JOIN TeamMembers tm ON u.ID_User = tm.ID_User
      LEFT JOIN Teams t ON tm.ID_Team = t.ID_Team
      GROUP BY u.ID_User, u.First_Name, u.Last_Name, u.Email, u.Phone, u.Avatar
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении расширенного списка сотрудников:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении сотрудников' });
  }
};


exports.getAllEmployeesFull = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT 
        U.ID_User,
        U.First_Name,
        U.Last_Name,
        U.Email,
        U.Phone,
        R.Role_Name AS Role,
        STRING_AGG(DISTINCT T.Team_Name, ', ') AS Teams,
        STRING_AGG(DISTINCT O.Order_Name, ', ') AS Projects,
        STRING_AGG(DISTINCT TK.Task_Name, ', ') AS Tasks
      FROM Users U
      LEFT JOIN Roles R ON U.ID_Role = R.ID_Role
      LEFT JOIN TeamMembers TM ON TM.ID_User = U.ID_User
      LEFT JOIN Teams T ON TM.ID_Team = T.ID_Team
      LEFT JOIN Orders O ON O.ID_Team = T.ID_Team
      LEFT JOIN Assignment A ON A.ID_Employee = U.ID_User
      LEFT JOIN Tasks TK ON A.ID_Task = TK.ID_Task
      GROUP BY U.ID_User, U.First_Name, U.Last_Name, U.Email, U.Phone, R.Role_Name
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка при получении сотрудников (full):', err);
    res.status(500).json({ message: 'Ошибка при получении сотрудников (full)' });
  }
};


exports.getAllEmployeesExtended = async (req, res) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      SELECT 
        U.ID_User,
        U.First_Name,
        U.Last_Name,
        U.Email,
        U.Phone,
        U.Avatar,
        U.Archived, -- ✅ добавлено

        -- Роли
        ISNULL((
          SELECT STRING_AGG(TM.Role + ' (Команда: ' + T.Team_Name + ')', ', ')
          FROM TeamMembers TM
          JOIN Teams T ON TM.ID_Team = T.ID_Team
          WHERE TM.ID_User = U.ID_User
        ), '–') AS Roles,

        -- Команды
        ISNULL((
          SELECT STRING_AGG(T.Team_Name, ', ')
          FROM TeamMembers TM
          JOIN Teams T ON TM.ID_Team = T.ID_Team
          WHERE TM.ID_User = U.ID_User
        ), '–') AS Teams,

        -- Проекты
        ISNULL((
          SELECT STRING_AGG(O.Order_Name, ', ')
          FROM Orders O
          WHERE EXISTS (
            SELECT 1
            FROM Teams T
            JOIN TeamMembers TM ON T.ID_Team = TM.ID_Team
            WHERE T.ID_Team = O.ID_Team AND TM.ID_User = U.ID_User
          )
        ), '–') AS Projects,

        -- Задачи
        ISNULL((
          SELECT STRING_AGG(TK.Task_Name, ', ')
          FROM Assignment A
          JOIN Tasks TK ON A.ID_Task = TK.ID_Task
          WHERE A.ID_Employee = U.ID_User
        ), '–') AS Tasks

      FROM Users U
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка при получении расширенной информации о сотрудниках:', err);
    res.status(500).json({ message: 'Ошибка сервера при получении сотрудников' });
  }
};


// back/controllers/employees.controller.js
// Получить профиль сотрудника по ID
exports.getEmployeeById = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          U.ID_User,
          U.First_Name,
          U.Last_Name,
          U.Email,
          U.Phone,
          U.Avatar,
          R.Role_Name AS Role,

          -- Агрегация команд
          (
            SELECT STRING_AGG(T.Team_Name, ', ')
            FROM TeamMembers TM
            JOIN Teams T ON TM.ID_Team = T.ID_Team
            WHERE TM.ID_User = U.ID_User
          ) AS Teams,

          -- Агрегация проектов
          (
            SELECT STRING_AGG(O.Order_Name, ', ')
            FROM Orders O
            WHERE EXISTS (
              SELECT 1 FROM TeamMembers TM
              JOIN Teams T ON TM.ID_Team = T.ID_Team
              WHERE TM.ID_User = U.ID_User AND T.ID_Team = O.ID_Team
            )
          ) AS Projects,

          -- Агрегация задач
          (
            SELECT STRING_AGG(TK.Task_Name, ', ')
            FROM Assignment A
            JOIN Tasks TK ON A.ID_Task = TK.ID_Task
            WHERE A.ID_Employee = U.ID_User
          ) AS Tasks

        FROM Users U
        LEFT JOIN Roles R ON U.ID_Role = R.ID_Role
        WHERE U.ID_User = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Профиль сотрудника не найден' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Ошибка при получении профиля сотрудника:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении профиля сотрудника' });
  }
};

exports.getTasksByEmployee = async (req, res) => {
  const employeeId = parseInt(req.params.id, 10);

  if (isNaN(employeeId)) {
    return res.status(400).json({ message: 'Некорректный ID сотрудника' });
  }

  try {
    await poolConnect;
    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .query(`
        SELECT T.ID_Task, T.Task_Name, S.Status_Name AS Status
        FROM Tasks T
        JOIN Assignment A ON T.ID_Task = A.ID_Task
        LEFT JOIN Statuses S ON T.ID_Status = S.ID_Status
        WHERE A.ID_Employee = @employeeId
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка при получении задач сотрудника:', err);
    res.status(500).json({ message: 'Ошибка при получении задач сотрудника' });
  }
};
