const { pool, sql, poolConnect } = require("../config/db");

exports.getProjects = async (req, res) => {
  const { teamId } = req.query;

  try {
    await poolConnect;
    const request = pool.request();

    if (!teamId) {
      return res.status(400).json({ message: "Не передан параметр teamId" });
    }

    request.input("TeamID", sql.Int, parseInt(teamId, 10));
    const result = await request.query(`
      SELECT ID_Order, Order_Name, Status
      FROM Orders
      WHERE ID_Team = @TeamID AND Status != 'Закрыт'
    `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("🔥 Ошибка при получении проектов:", error);
    res
      .status(500)
      .json({ message: "Ошибка при получении проектов", error: error.message });
  }
};

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
  TRIM(s.Status_Name) as Status_Name,
  o.Order_Name,
  t.ID_Order,       
  tm.Team_Name,
  a.ID_Employee AS Assigned_Employee_Id,
  u.ID_User,
  u.First_Name + ' ' + u.Last_Name AS Employee_Name,
  u.Avatar
FROM Tasks t


      LEFT JOIN Assignment a ON a.ID_Task = t.ID_Task
      INNER JOIN Statuses s ON t.ID_Status = s.ID_Status
LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
LEFT JOIN Teams tm ON o.ID_Team = tm.ID_Team

      LEFT JOIN Users u ON a.ID_Employee = u.ID_User
      WHERE s.Status_Name != 'Архив'
    `);

    // Группировка задач
    const tasksMap = {};

    result.recordset.forEach((row) => {
      const taskId = row.ID_Task;

      if (!tasksMap[taskId]) {
        tasksMap[taskId] = {
          ID_Task: row.ID_Task,
          Task_Name: row.Task_Name,
          Description: row.Description,
          Time_Norm: row.Time_Norm,
          Deadline: row.Deadline,
          Status_Name: row.Status_Name,
          Order_Name: row.Order_Name,
          ID_Order: row.ID_Order, // 🛠️ ДОБАВЬ ЭТУ СТРОКУ
          Team_Name: row.Team_Name,
          Assigned_Employee_Id: row.Assigned_Employee_Id,
          Employees: [],
        };
      }

      if (!tasksMap[taskId].AlsoAssignedEmployees) {
        tasksMap[taskId].AlsoAssignedEmployees = [];
      }
      if (row.ID_User && row.Employee_Name) {
        tasksMap[taskId].Employees.push({
          ID_Employee: row.ID_User,
          ID_User: row.ID_User,
          Full_Name: row.Employee_Name,
          Avatar: row.Avatar ?? null,
        });
      }
    });

    // 🟢 Новый блок: добавляем сотрудников из Assignment по связям Parent_Task_Id
    // чтобы видеть кто ещё назначен на эту задачу
    const additionalAssignments = await pool.request().query(`
      SELECT 
        a.ID_Task,
        a2.ID_Task AS Parent_Task_Id,
        a2.ID_Employee AS Additional_Employee_Id,
        u2.ID_User,
        u2.First_Name + ' ' + u2.Last_Name AS Additional_Employee_Name,
        u2.Avatar AS Additional_Employee_Avatar
      FROM Assignment a
      INNER JOIN Tasks t ON t.ID_Task = a.ID_Task
      LEFT JOIN Tasks t_parent ON t.ID_Task = t_parent.ID_Task
      LEFT JOIN Assignment a2 ON a2.ID_Task = t_parent.ID_Task OR a2.ID_Task = t.ID_Task
      LEFT JOIN Users u2 ON a2.ID_Employee = u2.ID_User
      WHERE a2.ID_Employee IS NOT NULL
    `);

    additionalAssignments.recordset.forEach((row) => {
      const taskId = row.ID_Task;
      const task = tasksMap[taskId];
      if (task && row.ID_User) {
        const alreadyExists = task.Employees.some(
          (emp) => emp.ID_Employee === row.ID_User
        );
        if (!alreadyExists) {
          task.Employees.push({
            ID_Employee: row.ID_User,
            Full_Name: row.Additional_Employee_Name,
            Avatar: row.Additional_Employee_Avatar ?? null,
          });
        }
      }
    });

    const tasks = Object.values(tasksMap);

    res.status(200).json(tasks);
  } catch (error) {
    console.error("🔥 Ошибка при получении задач:", error);
    res.status(500).json({
      message: "Ошибка при получении задач",
      error: error.message,
    });
  }
};

// 🔹 Создание задачи с записью в Execution
exports.createTask = async (req, res) => {
  const {
    Task_Name,
    Description,
    Time_Norm,
    ID_Order,
    Deadline,
    Employee_Names = [],
    ID_Manager: providedManager,
  } = req.body;

  let ID_Manager = providedManager;

  try {
    await poolConnect;

    // Проверка на дубликат задачи в том же заказе
    const duplicateResult = await pool
      .request()
      .input("Task_Name", sql.NVarChar, Task_Name)
      .input("ID_Order", sql.Int, ID_Order)
      .query(`
        SELECT COUNT(*) as DuplicateCount
        FROM Tasks
        WHERE Task_Name = @Task_Name AND ID_Order = @ID_Order
      `);

    if (duplicateResult.recordset[0].DuplicateCount > 0) {
      return res.status(400).json({
        message: `Задача с названием "${Task_Name}" уже существует в этом проекте`,
      });
    }

    // Найти менеджера, если не передан
    if (!ID_Manager && ID_Order) {
      const managerResult = await pool
        .request()
        .input("ID_Order", sql.Int, ID_Order)
        .query("SELECT ID_Manager FROM Orders WHERE ID_Order = @ID_Order");
      if (managerResult.recordset.length) {
        ID_Manager = managerResult.recordset[0].ID_Manager;
      }
    }

    if (!ID_Manager) {
      return res
        .status(400)
        .json({ message: "ID менеджера обязателен для создания задачи" });
    }

    // Статус "Новая"
    const statusResult = await pool
      .request()
      .input("Status_Name", sql.NVarChar, "Новая")
      .query("SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name");

    if (!statusResult.recordset.length) {
      return res.status(400).json({ message: 'Статус "Новая" не найден' });
    }

    const resolvedStatusId = statusResult.recordset[0].ID_Status;

    // Создание главной задачи
    const mainTaskResult = await pool
      .request()
      .input("Task_Name", sql.NVarChar, Task_Name)
      .input("Description", sql.NVarChar, Description)
      .input("Time_Norm", sql.Int, Time_Norm)
      .input("ID_Status", sql.Int, resolvedStatusId)
      .input("ID_Order", sql.Int, ID_Order)
      .input(
        "Deadline",
        sql.DateTime,
        Deadline
          ? new Date(Deadline)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      )
      .input("ID_Manager", sql.Int, ID_Manager)
      .query(`
        INSERT INTO Tasks 
          (Task_Name, Description, Time_Norm, ID_Status, ID_Order, Deadline, ID_Manager)
        OUTPUT INSERTED.ID_Task
        VALUES 
          (@Task_Name, @Description, @Time_Norm, @ID_Status, @ID_Order, @Deadline, @ID_Manager)
      `);

    const parentTaskId = mainTaskResult.recordset[0].ID_Task;

    for (const name of Employee_Names) {
      const [First_Name, Last_Name] = name.split(" ");
      const userResult = await pool
        .request()
        .input("First_Name", sql.NVarChar, First_Name)
        .input("Last_Name", sql.NVarChar, Last_Name)
        .query(`
          SELECT ID_User, Email
          FROM Users
          WHERE First_Name = @First_Name AND Last_Name = @Last_Name
        `);

      if (userResult.recordset.length) {
        const { ID_User, Email } = userResult.recordset[0];

        // Создание подзадачи для каждого сотрудника
        const taskResult = await pool
          .request()
          .input("Task_Name", sql.NVarChar, Task_Name)
          .input("Description", sql.NVarChar, Description)
          .input("Time_Norm", sql.Int, Time_Norm)
          .input("ID_Status", sql.Int, resolvedStatusId)
          .input("ID_Order", sql.Int, ID_Order)
          .input(
            "Deadline",
            sql.DateTime,
            Deadline
              ? new Date(Deadline)
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          )
          .input("ID_Manager", sql.Int, ID_Manager)
          .input("Parent_Task_ID", sql.Int, parentTaskId)
          .query(`
            INSERT INTO Tasks 
              (Task_Name, Description, Time_Norm, ID_Status, ID_Order, Deadline, ID_Manager, Parent_Task_ID)
            OUTPUT INSERTED.ID_Task
            VALUES 
              (@Task_Name, @Description, @Time_Norm, @ID_Status, @ID_Order, @Deadline, @ID_Manager, @Parent_Task_ID)
          `);

        const childTaskId = taskResult.recordset[0].ID_Task;

        // Запись назначения
        await pool
          .request()
          .input("ID_Task", sql.Int, childTaskId)
          .input("ID_Employee", sql.Int, ID_User)
          .input("Assignment_Date", sql.Date, new Date())
          .input("ID_Status", sql.Int, resolvedStatusId)
          .query(`
            INSERT INTO Assignment 
              (ID_Task, ID_Employee, Assignment_Date, ID_Status)
            VALUES 
              (@ID_Task, @ID_Employee, @Assignment_Date, @ID_Status)
          `);

        // Создание уведомления
        await pool
          .request()
          .input("Title", sql.NVarChar, "Назначена новая задача")
          .input("Description", sql.NVarChar, `Вам назначена задача "${Task_Name}"`)
          .input("UserEmail", sql.NVarChar, Email)
          .query(`
            INSERT INTO Notifications 
              (Title, Description, UserEmail)
            VALUES 
              (@Title, @Description, @UserEmail)
          `);
      }
    }

    res.status(201).json({ message: "Задачи и уведомления успешно созданы" });
  } catch (error) {
    console.error("🔥 Ошибка при создании задачи:", error);
    res.status(500).json({
      message: "Ошибка при создании задачи",
      error: error.message,
    });
  }
};

// 🔹 Исправление: убираем вызов DELETE по id=unassigned (некорректный id)
exports.deleteTask = async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    console.error("Некорректный ID задачи:", id);
    return res.status(400).json({ message: "Некорректный ID задачи" });
  }

  const taskId = parseInt(id, 10);

  try {
    await poolConnect;

    // Удалить из Execution
    await pool
      .request()
      .input("ID_Task", sql.Int, taskId)
      .query("DELETE FROM Execution WHERE ID_Task = @ID_Task");

    // Удалить из Assignment
    await pool
      .request()
      .input("ID_Task", sql.Int, taskId)
      .query("DELETE FROM Assignment WHERE ID_Task = @ID_Task");

    // Удалить из Tasks
    await pool
      .request()
      .input("ID_Task", sql.Int, taskId)
      .query("DELETE FROM Tasks WHERE ID_Task = @ID_Task");

    res.status(200).json({ message: "Задача и связанные записи удалены" });
  } catch (error) {
    console.error("🔥 Ошибка при удалении задачи:", error);
    res
      .status(500)
      .json({ message: "Ошибка при удалении задачи", error: error.message });
  }
};
exports.getTasksByEmployee = async (req, res) => {
  const { id } = req.params;
  const employeeId = parseInt(id, 10);

  if (!employeeId || isNaN(employeeId)) {
    console.error("Некорректный ID сотрудника:", id);
    return res.status(400).json({ message: "Некорректный ID сотрудника" });
  }

  try {
    await poolConnect;

    // 1. Основной запрос: получить задачи сотрудника
    const result = await pool.request().input("ID_User", sql.Int, employeeId)
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
      const alsoAssignedResult = await pool
        .request()
        .input("ParentID", sql.Int, parentId)
        .input("ID_User", sql.Int, employeeId) // 🔥 ДОБАВЛЕНО!
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
        AlsoAssignedEmployees: alsoAssignedResult.recordset,
      });
    }

    res.status(200).json(tasks);
  } catch (error) {
    console.error("🔥 Ошибка при получении задач сотрудника:", error);
    res
      .status(500)
      .json({
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
        s.Status_Name,
        o.Order_Name,
        o.ID_Order,
        tm.Team_Name,
        (
          SELECT ISNULL(SUM(e.Hours_Spent), 0)
          FROM Execution e
          WHERE e.ID_Task = t.ID_Task
        ) AS Hours_Spent_Total,  -- ✅ Добавлено
        (
          SELECT TOP 1 a1.ID_Employee
          FROM Assignment a1
          WHERE a1.ID_Task = t.ID_Task
          ORDER BY a1.ID_Employee ASC
        ) AS Assigned_Employee_Id,
        u.ID_User,
        u.First_Name + ' ' + u.Last_Name AS Employee_Name,
        u.Avatar
      FROM Tasks t
      LEFT JOIN Statuses s ON t.ID_Status = s.ID_Status
      LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
      LEFT JOIN Teams tm ON o.ID_Team = tm.ID_Team
      LEFT JOIN Assignment a ON a.ID_Task = t.ID_Task
      LEFT JOIN Users u ON a.ID_Employee = u.ID_User
    `);

    const tasks = Object.values(
      result.recordset.reduce((acc, row) => {
        if (!acc[row.ID_Task]) {
          acc[row.ID_Task] = {
            ID_Task: row.ID_Task,
            Task_Name: row.Task_Name,
            Description: row.Description,
            Time_Norm: row.Time_Norm,
            Hours_Spent_Total: row.Hours_Spent_Total, // ✅ Добавлено
            Deadline: row.Deadline,
            Status_Name: row.Status_Name,
            Order_Name: row.Order_Name,
            ID_Order: row.ID_Order,
            Team_Name: row.Team_Name,
            Assigned_Employee_Id: row.Assigned_Employee_Id,
            Employees: [],
          };
        }
        if (row.ID_User && row.Employee_Name) {
          acc[row.ID_Task].Employees.push({
            ID_Employee: row.ID_User,
            Full_Name: row.Employee_Name,
            Avatar: row.Avatar ?? null,
          });
        }
        return acc;
      }, {})
    );

    res.json(tasks);
  } catch (error) {
    console.error("🔥 Ошибка при получении задач с деталями:", error);
    res
      .status(500)
      .json({
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

exports.updateEmployeeTaskStatus = async (req, res) => {
  const { taskId } = req.params;
  const { employeeId, statusName } = req.body;

  if (!employeeId || !statusName) {
    return res.status(400).json({ message: 'employeeId и statusName обязательны' });
  }

  try {
    await poolConnect;

    // 1️⃣ Получаем ID статуса
    const statusResult = await pool.request()
      .input('StatusName', sql.NVarChar, statusName)
      .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @StatusName');

    if (statusResult.recordset.length === 0) {
      return res.status(404).json({ message: `Статус "${statusName}" не найден` });
    }

    const statusId = statusResult.recordset[0].ID_Status;

    // 2️⃣ Получаем дедлайн задачи
    const taskResult = await pool.request()
      .input('ID_Task', sql.Int, taskId)
      .query('SELECT Deadline, ID_Status, Parent_Task_ID FROM Tasks WHERE ID_Task = @ID_Task');

    if (!taskResult.recordset.length) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    const { Deadline, Parent_Task_ID } = taskResult.recordset[0];
    const isOverdue = new Date(Deadline) < new Date();

    // 3️⃣ Получаем ID "Выполнена"
    const completedResult = await pool.request()
      .input('StatusName', sql.NVarChar, 'Выполнена')
      .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @StatusName');
    const completedId = completedResult.recordset[0]?.ID_Status;

    // 4️⃣ Если просрочено, разрешаем только "Выполнена"
    if (isOverdue && statusId !== completedId) {
      return res.status(403).json({
        message: `Нельзя установить статус "${statusName}", т.к. задача просрочена. Разрешен только "Выполнена".`
      });
    }

    // 5️⃣ Обновляем статус в Assignment
    await pool.request()
      .input('ID_Task', sql.Int, taskId)
      .input('ID_Employee', sql.Int, employeeId)
      .input('ID_Status', sql.Int, statusId)
      .query(`
        UPDATE Assignment
        SET ID_Status = @ID_Status
        WHERE ID_Task = @ID_Task AND ID_Employee = @ID_Employee
      `);

    // 6️⃣ Обновляем статус текущей задачи
    await pool.request()
      .input('ID_Task', sql.Int, taskId)
      .input('ID_Status', sql.Int, statusId)
      .query(`
        UPDATE Tasks
        SET ID_Status = @ID_Status, OverdueCompleted = 0, Status_Updated_At = GETDATE()
        WHERE ID_Task = @ID_Task
      `);

    // 7️⃣ Обновляем родителя, если есть
    if (Parent_Task_ID) {
      await pool.request()
        .input('ID_Task', sql.Int, Parent_Task_ID)
        .input('ID_Status', sql.Int, statusId)
        .query(`
          UPDATE Tasks
          SET ID_Status = @ID_Status, OverdueCompleted = 0, Status_Updated_At = GETDATE()
          WHERE ID_Task = @ID_Task
        `);
    }

    res.status(200).json({ message: `Статус задачи обновлён на "${statusName}"` });
  } catch (error) {
    console.error('❌ Ошибка при обновлении статуса задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};


// Удаление всех архивных задач
const deleteArchivedTasks = async (req, res) => {
  try {
    await Task.destroy({ where: { Archive: true } });
    res.status(200).json({ message: "Архивные задачи удалены" });
  } catch (error) {
    res.status(500).json({ message: "Ошибка при удалении архивных задач" });
  }
};

exports.deleteAllArchivedTasks = async (req, res) => {
  try {
    await poolConnect;

    // Получение ID статуса "Архив"
    const statusResult = await pool
      .request()
      .input("Status_Name", sql.NVarChar, "Архив")
      .query("SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name");

    if (!statusResult.recordset.length) {
      return res.status(404).json({ message: 'Статус "Архив" не найден' });
    }

    const archiveStatusId = statusResult.recordset[0].ID_Status;

    // Удаление из Assignment
    await pool
      .request()
      .input("ID_Status", sql.Int, archiveStatusId)
      .query(
        "DELETE FROM Assignment WHERE ID_Task IN (SELECT ID_Task FROM Tasks WHERE ID_Status = @ID_Status)"
      );

    // Удаление из Tasks
    await pool
      .request()
      .input("ID_Status", sql.Int, archiveStatusId)
      .query("DELETE FROM Tasks WHERE ID_Status = @ID_Status");

    res.status(200).json({ message: "Все архивные задачи удалены" });
  } catch (error) {
    console.error("🔥 Ошибка при удалении архивных задач:", error);
    res
      .status(500)
      .json({
        message: "Ошибка при удалении архивных задач",
        error: error.message,
      });
  }
};


exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const {
    Task_Name,
    Description,
    Time_Norm,
    ID_Order,
    Deadline,
    ID_Status
  } = req.body;

  try {
    await poolConnect;

    // Проверка обязательных полей
    if (
      !Task_Name ||
      !Description ||
      Time_Norm === undefined ||
      !ID_Order ||
      !Deadline ||
      !ID_Status
    ) {
      return res.status(400).json({ message: "Все поля обязательны" });
    }

    // 1️⃣ Получить текущее название задачи
    const currentTaskResult = await pool
      .request()
      .input("ID_Task", sql.Int, id)
      .query(`
        SELECT Task_Name 
        FROM Tasks 
        WHERE ID_Task = @ID_Task
      `);

    if (!currentTaskResult.recordset.length) {
      return res.status(404).json({ message: "Задача не найдена" });
    }

    const currentTaskName = currentTaskResult.recordset[0].Task_Name;

    // 2️⃣ Если название изменилось, проверить на дубликат
    if (currentTaskName !== Task_Name) {
      const duplicateCheck = await pool
        .request()
        .input("Task_Name", sql.NVarChar, Task_Name)
        .input("ID_Order", sql.Int, ID_Order)
        .input("ID_Task", sql.Int, id)
        .query(`
          SELECT COUNT(*) as DuplicateCount
          FROM Tasks
          WHERE Task_Name = @Task_Name 
            AND ID_Order = @ID_Order 
            AND ID_Task != @ID_Task
        `);

      if (duplicateCheck.recordset[0].DuplicateCount > 0) {
        return res.status(400).json({
          message: `Задача с названием "${Task_Name}" уже существует в этом проекте`
        });
      }
    }

    // Приведение даты
    const parsedDeadline = new Date(Deadline);
    if (isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({ message: "Некорректный формат даты дедлайна" });
    }

    // Проверка ID статуса
    const statusCheck = await pool
      .request()
      .input("ID_Status", sql.Int, ID_Status)
      .query(`
        SELECT ID_Status 
        FROM Statuses 
        WHERE ID_Status = @ID_Status
      `);
    if (!statusCheck.recordset.length) {
      return res.status(400).json({ message: "Неверный ID статуса" });
    }

    // Обновляем задачу
    await pool
      .request()
      .input("ID_Task", sql.Int, id)
      .input("Task_Name", sql.NVarChar, Task_Name)
      .input("Description", sql.NVarChar, Description)
      .input("Time_Norm", sql.Int, Time_Norm)
      .input("ID_Order", sql.Int, ID_Order)
      .input("Deadline", sql.DateTime, parsedDeadline)
      .input("ID_Status", sql.Int, ID_Status)
      .query(`
        UPDATE Tasks
        SET 
          Task_Name = @Task_Name,
          Description = @Description,
          Time_Norm = @Time_Norm,
          ID_Order = @ID_Order,
          Deadline = @Deadline,
          ID_Status = @ID_Status
        WHERE ID_Task = @ID_Task
      `);

    res.status(200).json({ message: `Задача ${id} успешно обновлена` });
  } catch (error) {
    console.error("🔥 Ошибка при обновлении задачи:", error);
    res.status(500).json({
      message: `Обновление задачи ${id} завершилось с ошибкой`,
      error: error.message
    });
  }
};

// 🔹 Удалить задачи без исполнителя
exports.deleteUnassignedTasks = async (req, res) => {
  try {
    await poolConnect;

    // Найти все задачи без исполнителя
    const result = await pool.request().query(`
      SELECT t.ID_Task
      FROM Tasks t
      LEFT JOIN Assignment a ON t.ID_Task = a.ID_Task
      WHERE a.ID_Employee IS NULL
    `);

    const taskIds = result.recordset.map((row) => row.ID_Task);

    if (taskIds.length === 0) {
      return res.status(200).json({ message: "Нет задач для удаления" });
    }

    // Удаляем все связанные записи (Execution)
    await pool.request().query(`
      DELETE FROM Execution WHERE ID_Task IN (${taskIds.join(",")})
    `);

    // Удаляем назначения
    await pool.request().query(`
      DELETE FROM Assignment WHERE ID_Task IN (${taskIds.join(",")})
    `);

    // Удаляем сами задачи
    await pool.request().query(`
      DELETE FROM Tasks WHERE ID_Task IN (${taskIds.join(",")})
    `);

    res.status(200).json({ message: "Задачи без исполнителя удалены" });
  } catch (error) {
    console.error("🔥 Ошибка при удалении задач без исполнителя:", error);
    res
      .status(500)
      .json({
        message: "Ошибка при удалении задач без исполнителя",
        error: error.message,
      });
  }
};

exports.getTaskById = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.connect();

    // 1. Получить задачу
    const taskResult = await pool.request().input("ID_Task", sql.Int, id)
      .query(`
        SELECT 
          t.ID_Task,
          t.Task_Name,
          t.Description,
          t.Time_Norm,
          t.Deadline,
          s.Status_Name,
          o.Order_Name,
          o.ID_Order,
          tm.Team_Name
        FROM Tasks t
        LEFT JOIN Statuses s ON t.ID_Status = s.ID_Status
        LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
        LEFT JOIN Teams tm ON o.ID_Team = tm.ID_Team
        WHERE t.ID_Task = @ID_Task
      `);

    if (!taskResult.recordset.length) {
      return res.status(404).json({ message: "Задача не найдена" });
    }

    const task = taskResult.recordset[0];

    // 2. Получить назначенного исполнителя (основного)
    const assignedResult = await pool.request().input("ID_Task", sql.Int, id)
      .query(`
        SELECT TOP 1 a.ID_Employee 
        FROM Assignment a
        WHERE a.ID_Task = @ID_Task
        ORDER BY a.ID_Employee ASC
      `);

    const assignedEmployeeId = assignedResult.recordset[0]?.ID_Employee || null;

    // 3. Получить список всех исполнителей
    const employeesResult = await pool.request().input("ID_Task", sql.Int, id)
      .query(`
        SELECT 
          u.ID_User,
          u.First_Name,
          u.Last_Name,
          u.Avatar
        FROM Assignment a
        INNER JOIN Users u ON a.ID_Employee = u.ID_User
        WHERE a.ID_Task = @ID_Task
      `);

    const employees = employeesResult.recordset.map((emp) => ({
      ID_Employee: emp.ID_User,
      Full_Name: `${emp.First_Name} ${emp.Last_Name}`,
      Avatar: emp.Avatar,
    }));

    // 4. Возвращаем задачу
    res.json({
      ...task,
      Assigned_Employee_Id: assignedEmployeeId,
      Employees: employees,
    });
  } catch (error) {
    console.error("Ошибка при получении задачи:", error);
    res
      .status(500)
      .json({ message: "Ошибка при получении задачи", error: error.message });
  }
};

exports.getAllArchivedTasks = async (req, res) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      SELECT 
        t.ID_Task,
        t.Task_Name,
        t.Description,
        t.Time_Norm,
        t.Deadline,
        s.Status_Name,
        o.Order_Name,
        o.ID_Order,
        tm.Team_Name,
        (
          SELECT TOP 1 a1.ID_Employee
          FROM Assignment a1
          WHERE a1.ID_Task = t.ID_Task
          ORDER BY a1.ID_Employee ASC
        ) AS Assigned_Employee_Id,
        u.ID_User,
        u.First_Name + ' ' + u.Last_Name AS Employee_Name,
        u.Avatar
      FROM Tasks t
      LEFT JOIN Statuses s ON t.ID_Status = s.ID_Status
      LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
      LEFT JOIN Teams tm ON o.ID_Team = tm.ID_Team
      LEFT JOIN Assignment a ON a.ID_Task = t.ID_Task
      LEFT JOIN Users u ON a.ID_Employee = u.ID_User
      WHERE s.Status_Name = 'Архив'
    `);
    

    const tasksMap = {};

    result.recordset.forEach((row) => {
      const taskId = row.ID_Task;

      if (!tasksMap[taskId]) {
        tasksMap[taskId] = {
          ID_Task: row.ID_Task,
          Task_Name: row.Task_Name,
          Description: row.Description,
          Time_Norm: row.Time_Norm,
          Deadline: row.Deadline,
          Status_Name: row.Status_Name,
          Order_Name: row.Order_Name,
          Team_Name: row.Team_Name,
          Assigned_Employee_Id: row.Assigned_Employee_Id,
          Employees: [],
        };
      }

      if (row.ID_User && row.Employee_Name) {
        tasksMap[taskId].Employees.push({
          ID_Employee: row.ID_User,
          Full_Name: row.Employee_Name,
          Avatar: row.Avatar ?? null,
        });
      }
    });

    const archivedTasks = Object.values(tasksMap);
    res.status(200).json(archivedTasks);
  } catch (error) {
    console.error("🔥 Ошибка при получении архивных задач:", error);
    res
      .status(500)
      .json({
        message: "Ошибка при получении архивных задач",
        error: error.message,
      });
  }
};

exports.archiveTask = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    // Получить ID статуса "Архив"
    const statusResult = await pool
      .request()
      .input("Status_Name", sql.NVarChar, "Архив")
      .query("SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name");

    if (!statusResult.recordset.length) {
      return res.status(400).json({ message: 'Статус "Архив" не найден' });
    }

    const archiveStatusId = statusResult.recordset[0].ID_Status;

    // Обновить задачу в Tasks
    await pool
      .request()
      .input("ID_Task", sql.Int, id)
      .input("ID_Status", sql.Int, archiveStatusId)
      .query(
        "UPDATE Tasks SET ID_Status = @ID_Status WHERE ID_Task = @ID_Task"
      );

    // Обновить статус в Assignment для всех исполнителей
    await pool
      .request()
      .input("ID_Task", sql.Int, id)
      .input("ID_Status", sql.Int, archiveStatusId)
      .query(
        "UPDATE Assignment SET ID_Status = @ID_Status WHERE ID_Task = @ID_Task"
      );

    res.status(200).json({ message: `Задача ${id} перенесена в архив` });
  } catch (error) {
    console.error("🔥 Ошибка при переносе задачи в архив:", error);
    res
      .status(500)
      .json({
        message: "Ошибка при переносе задачи в архив",
        error: error.message,
      });
  }
};

// 🔹 Отметить просроченные задачи и завершить их
exports.checkAndUpdateOverdueTasks = async (req, res) => {
  try {
    await poolConnect;

    // 1. Получить ID статуса "Завершена"
    const statusResult = await pool
      .request()
      .input("Status_Name", sql.NVarChar, "Завершена").query(`
        SELECT ID_Status 
        FROM Statuses 
        WHERE Status_Name = @Status_Name
      `);

    if (!statusResult.recordset.length) {
      return res.status(400).json({ message: 'Статус "Завершена" не найден' });
    }

    const completedStatusId = statusResult.recordset[0].ID_Status;

    // 2. Обновить задачи с истекшим сроком
    await pool.request().input("ID_Status", sql.Int, completedStatusId).query(`
       UPDATE Tasks
SET ID_Status = @ID_Status,
    OverdueCompleted = 1
WHERE Deadline < GETDATE()
  AND ID_Status NOT IN (
    SELECT ID_Status 
    FROM Statuses 
    WHERE Status_Name IN ('Завершена', 'Выполнена', 'Архив')
  )
  AND (OverdueCompleted IS NULL OR OverdueCompleted = 0)

      `);

    res
      .status(200)
      .json({
        message:
          "Просроченные задачи обновлены и помечены как завершённые по просрочке.",
      });
  } catch (error) {
    console.error("🔥 Ошибка при обновлении просроченных задач:", error);
    res
      .status(500)
      .json({
        message: "Ошибка при обновлении просроченных задач",
        error: error.message,
      });
  }
};

exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { statusName } = req.body;

  if (!statusName) {
    return res.status(400).json({ message: "statusName обязателен" });
  }

  try {
    await poolConnect;

    const statusResult = await pool
      .request()
      .input("Status_Name", sql.NVarChar, statusName)
      .query("SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name");

    if (!statusResult.recordset.length) {
      return res.status(400).json({ message: "Недопустимый статус" });
    }

    const statusId = statusResult.recordset[0].ID_Status;

    // ✅ Обновляем статус задачи
    await pool
      .request()
      .input("ID_Task", sql.Int, id)
      .input("ID_Status", sql.Int, statusId)
      .query(
        "UPDATE Tasks SET ID_Status = @ID_Status, OverdueCompleted = 0 WHERE ID_Task = @ID_Task"
      );

    res.status(200).json({ message: "Статус задачи обновлён" });
  } catch (error) {
    console.error("🔥 Ошибка при обновлении статуса задачи:", error);
    res
      .status(500)
      .json({
        message: "Ошибка при обновлении статуса задачи",
        error: error.message,
      });
  }
};


module.exports = {
  getAllTasks: exports.getAllTasks,
  createTask: exports.createTask,
  deleteTask: exports.deleteTask,
  getTasksByEmployee: exports.getTasksByEmployee,
  getTasksWithDetails: exports.getTasksWithDetails,
  getTaskById: exports.getTaskById,
  closeTask: exports.closeTask,
  updateEmployeeTaskStatus: exports.updateEmployeeTaskStatus,
  deleteAllArchivedTasks: exports.deleteAllArchivedTasks,
  updateTask: exports.updateTask,
  getProjects: exports.getProjects,
  deleteUnassignedTasks: exports.deleteUnassignedTasks,
  archiveTask: exports.archiveTask,
  getAllArchivedTasks: exports.getAllArchivedTasks,
  checkAndUpdateOverdueTasks: exports.checkAndUpdateOverdueTasks,
  updateTaskStatus: exports.updateTaskStatus,
};
