const { pool, sql, poolConnect } = require("../config/db");
const db = require("../config/db");
const { createNotification } = require("../services/notification.service");
const { checkEmployeesExist } = require("../services/employee.service");
const stringify = require("json-stringify-safe");

function removeCircularReferences() {
  const seen = new WeakSet();
  return function (key, value) {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
}

// 🔹 Получение задач с фильтрацией
// 🔹 Получение всех задач с фильтрами (по сотруднику, по команде)
exports.getAllTasks = async (req, res) => {
  const { employee, team } = req.query;

  try {
    await poolConnect;
    const request = pool.request();
    if (employee) request.input("EmployeeID", sql.Int, parseInt(employee));
    if (team) request.input("TeamID", sql.Int, parseInt(team));

    const result = await request.query(`
      SELECT 
        t.ID_Task,
        t.Task_Name,
        t.Description,
        t.Time_Norm,
        t.Deadline,
        s.Status_Name,
        o.Order_Name,
        o.ID_Order,
        o.ID_Manager,
        tm.Team_Name,
        u.ID_User,
        u.First_Name + ' ' + u.Last_Name AS FullName,
        u.Avatar
      FROM Tasks t
      INNER JOIN Statuses s ON t.ID_Status = s.ID_Status
      INNER JOIN Orders o ON t.ID_Order = o.ID_Order
      INNER JOIN Teams tm ON o.ID_Team = tm.ID_Team
      INNER JOIN Assignment a ON t.ID_Task = a.ID_Task
      INNER JOIN Users u ON a.ID_Employee = u.ID_User
      WHERE 1=1
        ${employee ? "AND a.ID_Employee = @EmployeeID" : ""}
        ${team ? "AND tm.ID_Team = @TeamID" : ""}
    `);

    const tasksMap = new Map();
    for (const row of result.recordset) {
      if (!tasksMap.has(row.ID_Task)) {
        tasksMap.set(row.ID_Task, {
          ID_Task: row.ID_Task,
          Task_Name: row.Task_Name,
          Description: row.Description,
          Time_Norm: row.Time_Norm,
          Deadline: row.Deadline,
          Status_Name: row.Status_Name,
          Order_Name: row.Order_Name,
          ID_Order: row.ID_Order,
          ID_Manager: row.ID_Manager,
          Team_Name: row.Team_Name,
          Employees: [],
        });
      }

      const task = tasksMap.get(row.ID_Task);
      task.Employees.push({
        id: row.ID_User,
        fullName: row.FullName,
        avatar: row.Avatar ?? null,
      });
    }

    const tasks = Array.from(tasksMap.values());

    // Создание независимых карточек для каждого сотрудника
    const employeeTasks = tasks.flatMap((task) =>
      task.Employees.map((emp) => ({
        ...task,
        EmployeeId: emp.id,
        EmployeeName: emp.fullName,
        EmployeeAvatar: emp.avatar ?? null,
        Status_Name: task.Status_Name, // Разные статусы могут быть у разных сотрудников
      }))
    );

    res.status(200).json(employeeTasks);
  } catch (error) {
    console.error("🔥 Ошибка при получении задач:", error);
    res
      .status(500)
      .json({ message: "Ошибка при получении задач", error: error.message });
  }
};

// 🔹 Обновление задачи
exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const {
    Task_Name,
    Description,
    Time_Norm,
    Status_Name,
    ID_Status,
    ID_Order,
    Deadline,
  } = req.body;

  try {
    await poolConnect;

    let resolvedStatusId = ID_Status;
    if (!resolvedStatusId && Status_Name) {
      const statusResult = await pool
        .request()
        .input("Status_Name", sql.NVarChar, Status_Name)
        .query(
          "SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name"
        );
      if (!statusResult.recordset.length) {
        return res.status(400).json({ message: "Недопустимый статус" });
      }
      resolvedStatusId = statusResult.recordset[0].ID_Status;
    }

    if (!resolvedStatusId) {
      return res.status(400).json({
        message: "Статус задачи обязателен (ID_Status или Status_Name)",
      });
    }

    const fields = [];
    const request = pool.request().input("ID_Task", sql.Int, id);

    if (Task_Name !== undefined) {
      fields.push("Task_Name = @Task_Name");
      request.input("Task_Name", sql.NVarChar, Task_Name);
    }
    if (Description !== undefined) {
      fields.push("Description = @Description");
      request.input("Description", sql.NVarChar, Description);
    }
    if (Time_Norm !== undefined) {
      fields.push("Time_Norm = @Time_Norm");
      request.input("Time_Norm", sql.Int, Time_Norm);
    }
    if (ID_Order !== undefined) {
      fields.push("ID_Order = @ID_Order");
      request.input("ID_Order", sql.Int, ID_Order);
    }
    if (Deadline !== undefined) {
      fields.push("Deadline = @Deadline");
      request.input("Deadline", sql.DateTime, Deadline);
    }

    fields.push("ID_Status = @ID_Status");
    request.input("ID_Status", sql.Int, resolvedStatusId);

    if (!fields.length) {
      return res.status(400).json({ message: "Нет полей для обновления" });
    }

    const query = `UPDATE Tasks SET ${fields.join(
      ", "
    )} WHERE ID_Task = @ID_Task`;
    await request.query(query);

    res.status(200).json({ message: "Задача успешно обновлена" });
  } catch (error) {
    console.error("🔥 Ошибка при обновлении задачи:", error);
    res
      .status(500)
      .json({ message: "Ошибка при обновлении задачи", error: error.message });
  }
};

// 🔹 Удаление задачи
exports.deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;
    await pool
      .request()
      .input("ID_Task", sql.Int, id)
      .query("DELETE FROM Assignment WHERE ID_Task = @ID_Task");
    await pool
      .request()
      .input("ID_Task", sql.Int, id)
      .query("DELETE FROM Tasks WHERE ID_Task = @ID_Task");

    res.status(200).json({ message: "Задача и назначения успешно удалены" });
  } catch (error) {
    console.error("🔥 Ошибка при удалении задачи:", error);
    res
      .status(500)
      .json({ message: "Ошибка при удалении задачи", error: error.message });
  }
};

// 🔹 Получение задач по сотруднику
// Получение задач по сотруднику с проверкой ID
exports.getTasksByEmployee = async (req, res) => {
  const { id } = req.params;

  const employeeId = parseInt(id, 10);

  if (!employeeId || isNaN(employeeId)) {
    console.error("Некорректный ID сотрудника:", id);
    return res.status(400).json({ message: "Некорректный ID сотрудника" });
  }

  try {
    await poolConnect;
    const result = await pool.request().input("ID_User", sql.Int, employeeId)
      .query(`
        SELECT 
          t.ID_Task,
          t.Task_Name,
          t.Description,
          s.Status_Name,
          o.Order_Name,
          tm.Team_Name,
          t.Time_Norm,
          t.Deadline
        FROM Assignment a
        INNER JOIN Tasks t ON a.ID_Task = t.ID_Task
        INNER JOIN Statuses s ON t.ID_Status = s.ID_Status
        INNER JOIN Orders o ON t.ID_Order = o.ID_Order
        INNER JOIN Teams tm ON o.ID_Team = tm.ID_Team
        WHERE a.ID_Employee = @ID_User
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("🔥 Ошибка при получении задач сотрудника:", error);
    res.status(500).json({
      message: "Ошибка при получении задач сотрудника",
      error: error.message,
    });
  }
};

// 🔹 Получение всех задач с деталями
exports.getTasksWithDetails = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT 
        t.ID_Task,
        t.Task_Name,
        t.Description,
        t.Time_Norm,
        t.Deadline,
        t.Status_Updated_At,
        o.Order_Name,
        o.ID_Order,
        o.ID_Manager,
        tm.Team_Name,
        a.ID_Employee AS EmployeeId,
        u.First_Name + ' ' + u.Last_Name AS EmployeeName,
        u.Avatar AS EmployeeAvatar,
        s.Status_Name AS AssignmentStatusName
      FROM Tasks t
      LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
      LEFT JOIN Teams tm ON o.ID_Team = tm.ID_Team
      INNER JOIN Assignment a ON t.ID_Task = a.ID_Task
      INNER JOIN Users u ON a.ID_Employee = u.ID_User
      LEFT JOIN Statuses s ON a.ID_Status = s.ID_Status
    `);

    const tasksMap = new Map();

    for (const row of result.recordset) {
      if (!tasksMap.has(row.ID_Task)) {
        tasksMap.set(row.ID_Task, {
          ID_Task: row.ID_Task,
          Task_Name: row.Task_Name,
          Description: row.Description,
          Time_Norm: row.Time_Norm,
          Deadline: row.Deadline,
          Status_Updated_At: row.Status_Updated_At,
          Status_Name: row.Status_Name,
          Order_Name: row.Order_Name,
          ID_Order: row.ID_Order,
          ID_Manager: row.ID_Manager,
          Team_Name: row.Team_Name,
          Employees: [],
        });
      }

      const task = tasksMap.get(row.ID_Task);
      if (row.EmployeeId && row.EmployeeName) {
        task.Employees.push({
          id: row.EmployeeId,
          fullName: row.EmployeeName,
          avatar: row.EmployeeAvatar ?? null,
          AssignmentStatusName: row.AssignmentStatusName,
        });
      }
    }

    const tasks = Array.from(tasksMap.values());

    res.status(200).json(tasks);
  } catch (error) {
    console.error("🔥 Ошибка при получении задач с деталями:", error);
    res.status(500).json({
      message: "Ошибка при получении задач с деталями",
      error: error.message,
    });
  }
};

// 🔹 Закрытие задачи
exports.closeTask = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    // Получить ID статуса "Завершена"
    const statusResult = await pool
      .request()
      .input("Status_Name", sql.NVarChar, "Завершена")
      .query("SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name");

    if (!statusResult.recordset.length) {
      return res.status(400).json({ message: 'Статус "Завершена" не найден' });
    }

    const completedStatusId = statusResult.recordset[0].ID_Status;

    // Обновить задачу, установив статус "Завершена"
    await pool
      .request()
      .input("ID_Task", sql.Int, id)
      .input("ID_Status", sql.Int, completedStatusId)
      .query(
        "UPDATE Tasks SET ID_Status = @ID_Status WHERE ID_Task = @ID_Task"
      );

    res.status(200).json({ message: "Задача успешно закрыта" });
  } catch (error) {
    console.error("🔥 Ошибка при закрытии задачи:", error);
    res
      .status(500)
      .json({ message: "Ошибка при закрытии задачи", error: error.message });
  }
};
// 🔹 Обновление статуса задачи для конкретного сотрудника
exports.updateEmployeeTaskStatus = async (req, res) => {
  const { taskId } = req.params;
  const { employeeId, statusName } = req.body;

  if (!employeeId || !statusName) {
    return res
      .status(400)
      .json({ message: "employeeId и statusName обязательны" });
  }

  try {
    await poolConnect;

    // Найти ID статуса по имени
    const statusResult = await pool
      .request()
      .input("Status_Name", sql.NVarChar, statusName)
      .query("SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name");

    if (!statusResult.recordset.length) {
      return res.status(400).json({ message: "Недопустимый статус" });
    }

    const statusId = statusResult.recordset[0].ID_Status;

    // Обновить статус в таблице Assignment для конкретного сотрудника и задачи
    // Обновить статус в таблице Assignment для конкретного сотрудника и задачи
    await pool
      .request()
      .input("ID_Task", sql.Int, taskId)
      .input("ID_Employee", sql.Int, employeeId)
      .input("ID_Status", sql.Int, statusId).query(`
    UPDATE Assignment
    SET ID_Status = @ID_Status
    WHERE ID_Task = @ID_Task AND ID_Employee = @ID_Employee
  `);

    // ✅ Также обновить общий статус в таблице Tasks
    await pool
      .request()
      .input("ID_Task", sql.Int, taskId)
      .input("ID_Status", sql.Int, statusId).query(`
    UPDATE Tasks
    SET ID_Status = @ID_Status
    WHERE ID_Task = @ID_Task
  `);

    res.status(200).json({ message: "Статус задачи для сотрудника обновлен" });
  } catch (error) {
    console.error("🔥 Ошибка при обновлении статуса задачи сотрудника:", error);
    res.status(500).json({
      message: "Ошибка при обновлении статуса задачи сотрудника",
      error: error.message,
    });
  }
};

exports.deleteTasksWithoutEmployees = async (req, res) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      DELETE FROM Tasks
      WHERE ID_Task IN (
        SELECT t.ID_Task
        FROM Tasks t
        LEFT JOIN Assignment a ON t.ID_Task = a.ID_Task
        WHERE a.ID_Employee IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM Assignment a2 WHERE a2.ID_Task = t.ID_Task
           )
      )
    `);

    res.status(200).json({ message: "Задачи без сотрудников удалены" });
  } catch (error) {
    console.error("🔥 Ошибка при удалении задач без сотрудников:", error);
    res.status(500).json({
      message: "Ошибка при удалении задач без сотрудников",
      error: error.message,
    });
  }
};

exports.getTeamsWithMembers = async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT 
        tm.ID_Team,
        tm.Team_Name,
        tm.IsArchived,
        u.ID_User,
        u.First_Name + ' ' + u.Last_Name AS Full_Name,
        u.Avatar,
        u.Role
      FROM Teams tm
      LEFT JOIN Users u ON tm.ID_Team = u.ID_Team
      ORDER BY tm.ID_Team
    `);

    const teamsMap = new Map();

    result.recordset.forEach((row) => {
      if (!teamsMap.has(row.ID_Team)) {
        teamsMap.set(row.ID_Team, {
          ID_Team: row.ID_Team,
          Team_Name: row.Team_Name,
          IsArchived: row.IsArchived,
          members: [], // 👈 исправлено с "Members" на "members"
        });
      }

      if (row.ID_User) {
        teamsMap.get(row.ID_Team).members.push({ // 👈 исправлено с "Members" на "members"
          ID_User: row.ID_User,
          Full_Name: row.Full_Name,
          Avatar: row.Avatar,
          Role: row.Role,
        });
      }
    });

    const teams = Array.from(teamsMap.values());

    res.status(200).json(teams);
  } catch (error) {
    console.error("🔥 Ошибка при получении команд с участниками:", error);
    res.status(500).json({
      message: "Ошибка при получении команд с участниками",
      error: error.message,
    });
  }
};


exports.archiveTask = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    const result = await pool.request().input("ID_Task", sql.Int, id).query(`
        UPDATE Tasks
        SET IsArchived = 1
        WHERE ID_Task = @ID_Task
      `);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ message: "Задача не найдена или уже архивирована" });
    }

    res.status(200).json({ message: "Задача успешно перенесена в архив" });
  } catch (error) {
    console.error("🔥 Ошибка при архивации задачи:", error);
    res
      .status(500)
      .json({ message: "Ошибка при архивации задачи", error: error.message });
  }
};

exports.checkEmployeesExist = async (req, res) => {
  const { EmployeeIdentifiers } = req.body;

  if (!Array.isArray(EmployeeIdentifiers) || EmployeeIdentifiers.length === 0) {
    return res.status(400).json({ message: "Список сотрудников пуст" });
  }

  try {
    await poolConnect;
    const request = pool.request();

    // Подготовка параметров для запроса
    const conditions = [];
    EmployeeIdentifiers.forEach((identifier, index) => {
      const paramName = `param${index}`;
      if (typeof identifier === 'number') {
        request.input(paramName, sql.Int, identifier);
        conditions.push(`ID_User = @${paramName}`);
      } else if (typeof identifier === 'string') {
        request.input(paramName, sql.NVarChar, identifier);
        conditions.push(`Email = @${paramName} OR (First_Name + ' ' + Last_Name) = @${paramName}`);
      }
    });

    const query = `
      SELECT ID_User, Email, First_Name, Last_Name
      FROM Users
      WHERE ${conditions.join(' OR ')}
    `;

    const result = await request.query(query);

    const foundIdentifiers = result.recordset.map(user => user.ID_User); // <-- исправлено
    
    const notFound = EmployeeIdentifiers.filter(identifier => {
      return !foundIdentifiers.includes(identifier); // <-- числовое сравнение
    });
    
    if (notFound.length > 0) {
      return res.status(404).json({
        message: `Некоторые сотрудники не найдены: ${notFound.join(', ')}`,
      });
    }
    

    return res.status(200).json({ message: "Все сотрудники существуют" });
  } catch (error) {
    console.error("Ошибка при проверке сотрудников:", error);
    return res.status(500).json({
      message: "Ошибка при проверке сотрудников",
      error: error.message,
    });
  }
};


exports.createTask = async (req, res) => {
  try {
    const {
      Task_Name,
      Description,
      ID_Order,
      Time_Norm,
      Deadline,
      EmployeeIds,
    } = req.body;

    console.log("Received EmployeeIds: ", EmployeeIds); // Логируем входящие данные для проверки

    if (!EmployeeIds || EmployeeIds.length === 0) {
      return res.status(400).json({ error: "Сотрудники не указаны" });
    }

    // Фильтруем некорректные ID сотрудников
    // Фильтруем некорректные ID сотрудников
   // Фильтрация и валидация идентификаторов сотрудников
   const sanitizedEmployeeIds = EmployeeIds.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0);

console.log("Sanitized EmployeeIds: ", sanitizedEmployeeIds);

// Проверка, что список не пуст
if (sanitizedEmployeeIds.length === 0) {
  return res.status(400).json({ message: "Список сотрудников пуст или содержит некорректные значения" });
}

// Создание запроса с параметрами для каждого идентификатора
const request = pool.request();
sanitizedEmployeeIds.forEach((id, index) => {
  request.input(`id${index}`, sql.Int, id);
});
const idsPlaceholders = sanitizedEmployeeIds.map((_, index) => `@id${index}`).join(', ');
const query = `SELECT ID_User FROM Users WHERE ID_User IN (${idsPlaceholders})`;

// Выполнение запроса
const employeeQueryResult = await request.query(query);

// Получение реальных идентификаторов сотрудников из результата запроса
const realEmployeeIds = employeeQueryResult.recordset.map(row => row.ID_User);
console.log("Real Employee IDs from DB: ", realEmployeeIds);

// Проверка, что все переданные сотрудники существуют в базе данных
const invalidEmployeeIds = sanitizedEmployeeIds.filter(id => !realEmployeeIds.includes(id));
if (invalidEmployeeIds.length > 0) {
  return res.status(404).json({
    message: `Некоторые сотрудники не найдены: ${invalidEmployeeIds.join(", ")}`,
  });
}


    // Получение ID статуса "Новая"
    const statusResult = await pool
      .request()
      .input("Status_Name", sql.NVarChar, "Новая")
      .query("SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name");

    const newStatusId = statusResult.recordset[0].ID_Status;

    // Проверка количества незавершенных задач для каждого сотрудника
    // Проверка количества незавершенных задач для каждого сотрудника
    for (const empId of realEmployeeIds) {
      const tasksResult = await pool
        .request()
        .input("ID_Employee", sql.Int, empId).query(`
      SELECT COUNT(*) AS TaskCount
      FROM Assignment a
      JOIN Tasks t ON a.ID_Task = t.ID_Task
      WHERE a.ID_Employee = @ID_Employee
        AND t.ID_Status != (SELECT ID_Status FROM Statuses WHERE Status_Name = 'Завершена')
    `);

      const taskCount = tasksResult.recordset[0].TaskCount;
      if (taskCount >= 5) {
        return res.status(400).json({
          message: `Сотрудник с ID ${empId} уже имеет 5 незавершенных задач, не может быть назначен на новую задачу.`,
        });
      }
    }

    // Создание задачи
    const taskResult = await pool
      .request()
      .input("Task_Name", sql.NVarChar, Task_Name)
      .input("Description", sql.NVarChar, Description)
      .input("ID_Order", sql.Int, ID_Order)
      .input("Time_Norm", sql.Int, Time_Norm)
      .input("Deadline", sql.DateTime, Deadline ? new Date(Deadline) : null)
      .input("ID_Status", sql.Int, newStatusId).query(`
        INSERT INTO Tasks (Task_Name, Description, ID_Order, Time_Norm, Deadline, ID_Status)
        OUTPUT INSERTED.ID_Task
        VALUES (@Task_Name, @Description, @ID_Order, @Time_Norm, @Deadline, @ID_Status)
      `);

    const newTaskId = taskResult.recordset[0].ID_Task;
    console.log("Created task with ID:", newTaskId);

    // Вставка сотрудников в Assignment
    const assignments = realEmployeeIds.map(async (empId) => {
      console.log("Assigning employee with ID:", empId); // Логируем ID сотрудника
      await pool
        .request()
        .input("ID_Task", sql.Int, newTaskId)
        .input("ID_Employee", sql.Int, empId)
        .input("ID_Status", sql.Int, newStatusId).query(`
          INSERT INTO Assignment (ID_Task, ID_Employee, ID_Status)
          VALUES (@ID_Task, @ID_Employee, @ID_Status)
        `);
    });

    // Выполнение всех вставок сотрудников
    await Promise.all(assignments);

    res
      .status(201)
      .json({ message: "Task successfully created", ID_Task: newTaskId });
  } catch (error) {
    console.error("Error creating task:", error);
    res
      .status(500)
      .json({ message: "Error creating task", error: error.message });
  }
};
