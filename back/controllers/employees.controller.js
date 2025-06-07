// back/controllers/employees.controller.js

const { pool, poolConnect, sql } = require("../config/db");

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
    console.error("Ошибка при получении сотрудников:", err);
    res.status(500).json({ message: "Ошибка при получении сотрудников" });
  }
};

// Поиск данных сотрудника (используется в поиске в шапке)
exports.fullSearchEmployeeData = async (req, res) => {
  const { q, employeeEmail } = req.query;

  if (!q || !employeeEmail) {
    return res.status(400).json({ message: "Параметры поиска обязательны" });
  }

  try {
    await poolConnect;

    const result = await pool
      .request()
      .input("query", sql.NVarChar(255), `%${q}%`)
      .input("email", sql.NVarChar(255), employeeEmail).query(`
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
    console.error("Ошибка поиска данных сотрудника:", error);
    res.status(500).json({ message: "Ошибка поиска данных сотрудника" });
  }
};

exports.updateEmployeeProfile = async (req, res) => {
  const { id, firstName, lastName, phone, ID_Role } = req.body;

  if (!id || !firstName || !lastName || (ID_Role === undefined)) {
    return res.status(400).json({ message: "Некорректные данные" });
  }

  try {
    // Если роль не указана, ставим роль по умолчанию (31 - Сотрудник)
    const role = ID_Role || 31;  // Если роль не передана, ставим роль 31

    // Логирование данных для отладки
    console.log(`Updating user ${id} with role ${role}`);

    await poolConnect;
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("firstName", sql.NVarChar(255), firstName)
      .input("lastName", sql.NVarChar(255), lastName)
      .input("phone", sql.NVarChar(50), phone || null)
      .input("ID_Role", sql.Int, role)
      .query(`
        UPDATE Users
        SET First_Name = @firstName,
            Last_Name = @lastName,
            Phone = @phone,
            ID_Role = @ID_Role
        WHERE ID_User = @id
      `);

    res.json({ message: "Профиль успешно обновлён" });
  } catch (error) {
    console.error("Ошибка при обновлении профиля:", error);
    res.status(500).json({ message: "Ошибка при обновлении профиля" });
  }
};


const path = require("path");
const multer = require("multer");

// Настройка хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
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
  upload.single("avatar"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Файл не загружен" });
    }

    const { userId } = req.body;
    const filename = req.file.filename;

    try {
      await poolConnect;
      await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("avatar", sql.NVarChar(255), filename).query(`
          UPDATE Users
          SET Avatar = @avatar
          WHERE ID_User = @userId
        `);

      res.json({ filename });
    } catch (error) {
      console.error("Ошибка при сохранении аватара:", error);
      res.status(500).json({ message: "Ошибка при сохранении аватара" });
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
    console.error(
      "Ошибка при получении расширенного списка сотрудников:",
      error
    );
    res
      .status(500)
      .json({ message: "Ошибка сервера при получении сотрудников" });
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
    console.error("Ошибка при получении сотрудников (full):", err);
    res
      .status(500)
      .json({ message: "Ошибка при получении сотрудников (full)" });
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
        U.Archived,

        -- 🎯 Роли
        CASE 
          WHEN U.ID_Role = 1 THEN R.Role_Name
          ELSE ISNULL((
            SELECT STRING_AGG(TM.Role + ' (Команда: ' + T.Team_Name + ')', ', ')
            FROM TeamMembers TM
            JOIN Teams T ON TM.ID_Team = T.ID_Team
            WHERE TM.ID_User = U.ID_User
          ), '–')
        END AS Roles,

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
      LEFT JOIN Roles R ON U.ID_Role = R.ID_Role
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Ошибка при получении расширенной информации:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};



// back/controllers/employees.controller.js
// Получить профиль сотрудника по ID
exports.getEmployeeById = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    const result = await pool.request().input("id", sql.Int, id).query(`
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
      return res.status(404).json({ message: "Профиль сотрудника не найден" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Ошибка при получении профиля сотрудника:", error);
    res
      .status(500)
      .json({ message: "Ошибка сервера при получении профиля сотрудника" });
  }
};
exports.getTasksByEmployee = async (req, res) => {
  const { id } = req.params;
  const employeeId = parseInt(id, 10);

  if (!employeeId || isNaN(employeeId)) {
    console.error('Некорректный ID сотрудника:', id);
    return res.status(400).json({ message: 'Некорректный ID сотрудника' });
  }

  try {
    await poolConnect;

    // 1. Основной запрос: получить задачи сотрудника
    const result = await pool.request()
      .input('ID_User', sql.Int, employeeId)
      .query(`
        SELECT 
          t.ID_Task,
          t.Parent_Task_ID,
          t.Task_Name,
          t.Description,
          s.Status_Name,
          o.Order_Name,
          tm.Team_Name,
          t.Time_Norm,
          t.Deadline,
          u.ID_User AS EmployeeId,
          u.First_Name + ' ' + u.Last_Name AS EmployeeName,
          u.Avatar
        FROM Assignment a
        INNER JOIN Tasks t ON a.ID_Task = t.ID_Task
        INNER JOIN Statuses s ON t.ID_Status = s.ID_Status
        INNER JOIN Orders o ON t.ID_Order = o.ID_Order
        INNER JOIN Teams tm ON o.ID_Team = tm.ID_Team
        LEFT JOIN Users u ON a.ID_Employee = u.ID_User
        WHERE a.ID_Employee = @ID_User
      `);

    const tasks = [];

    for (const task of result.recordset) {
      const parentId = task.Parent_Task_ID || task.ID_Task;

// 2. Найти всех остальных сотрудников с таким Parent_Task_ID
const alsoAssignedResult = await pool.request()
  .input('ParentID', sql.Int, parentId)
  .input('ID_User', sql.Int, employeeId) // 🔥 ДОБАВЛЕНО!
  .query(`
    SELECT DISTINCT u.ID_User, u.First_Name + ' ' + u.Last_Name AS EmployeeName, u.Avatar
    FROM Tasks t
    INNER JOIN Assignment a ON t.ID_Task = a.ID_Task
    INNER JOIN Users u ON a.ID_Employee = u.ID_User
    WHERE (t.Parent_Task_ID = @ParentID OR t.ID_Task = @ParentID)
    AND u.ID_User != @ID_User
  `);


      // Собираем задачу
      tasks.push({
        ...task,
        AlsoAssignedEmployees: alsoAssignedResult.recordset
      });
    }

    res.status(200).json(tasks);
  } catch (error) {
    console.error('🔥 Ошибка при получении задач сотрудника:', error);
    res.status(500).json({ message: 'Ошибка при получении задач сотрудника', error: error.message });
  }
};


exports.getEmployeesByTeam = async (req, res) => {
  const { teamId } = req.query;
  if (!teamId) {
    return res.status(400).json({ message: 'Не указан ID команды' });
  }

  try {
    await poolConnect;
    const result = await pool.request()
      .input('teamId', sql.Int, teamId)
      .query(`
        SELECT 
          u.ID_User AS ID_Employee,
          u.First_Name,
          u.Last_Name,
          u.Avatar,
          tm.Role AS Position  -- 🟢 БЕРЕМ РОЛЬ ИЗ TeamMembers!
        FROM Users u
        JOIN TeamMembers tm ON u.ID_User = tm.ID_User
        WHERE tm.ID_Team = @teamId
      `);

    const formattedEmployees = result.recordset.map(emp => ({
      ID_Employee: emp.ID_Employee,
      First_Name: emp.First_Name,
      Last_Name: emp.Last_Name,
      Full_Name: `${emp.First_Name} ${emp.Last_Name}`,
      Position: emp.Position ?? "Без должности",
      Avatar: emp.Avatar ?? null
    }));

    res.json(formattedEmployees);
  } catch (error) {
    console.error('Ошибка при получении сотрудников команды:', error);
    res.status(500).json({ message: 'Ошибка при получении сотрудников команды' });
  }
};

// Удалить сотрудника (и уведомления)
exports.deleteEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    // 🔎 Найти Email пользователя
    const userResult = await pool.request()
      .input("ID_User", sql.Int, id)
      .query("SELECT Email FROM Users WHERE ID_User = @ID_User");

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const userEmail = userResult.recordset[0].Email;

    // 🗑️ Удалить уведомления пользователя
    await pool.request()
      .input("UserEmail", sql.NVarChar, userEmail)
      .query("DELETE FROM Notifications WHERE UserEmail = @UserEmail");

    // 🗑️ Удалить самого пользователя
    await pool.request()
      .input("ID_User", sql.Int, id)
      .query("DELETE FROM Users WHERE ID_User = @ID_User");

    res.json({ message: "Пользователь и связанные уведомления успешно удалены" });
  } catch (error) {
    console.error("Ошибка при удалении пользователя:", error);
    res.status(500).json({ message: "Ошибка сервера при удалении пользователя" });
  }
};
