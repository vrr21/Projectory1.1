const { sql, poolConnect, pool } = require("../config/db");
const { createNotification } = require("../services/notification.service");

// 🔹 Добавить запись учета времени
const createTimeEntry = async (req, res) => {
  const { taskName, description, hours, date, isCompleted, link, attachments } = req.body;

  try {
    await poolConnect;

    const tokenUser = req.user;
    if (!tokenUser?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 1. Получить Time_Norm из Tasks
    const timeNormResult = await pool
      .request()
      .input("ID_Task", sql.Int, parseInt(taskName))
      .query(`
        SELECT Time_Norm 
        FROM Tasks 
        WHERE ID_Task = @ID_Task
      `);

    const timeNorm = timeNormResult.recordset[0]?.Time_Norm || null;

    // 2. Вставка записи в Execution (с OUTPUT)
    const insertResult = await pool
      .request()
      .input("ID_Task", sql.Int, parseInt(taskName))
      .input("ID_Employee", sql.Int, tokenUser.id)
      .input("Start_Date", sql.DateTime, new Date(date))
      .input("End_Date", sql.DateTime, new Date(date))
      .input("Description", sql.NVarChar(sql.MAX), description || "")
      .input("Hours_Spent", sql.Decimal(5, 2), hours)
      .input("Time_Norm", sql.Int, timeNorm)
      .input("Is_Completed", sql.Bit, isCompleted ? 1 : 0)
      .input("Link", sql.NVarChar(sql.MAX), link || null) // 🔥 Добавил ссылку
      .input("Attachments", sql.NVarChar(sql.MAX), attachments ? attachments.join(",") : null) // 🔥 Добавил вложения
      .query(`
        INSERT INTO Execution 
          (ID_Task, ID_Employee, Start_Date, End_Date, Description, Hours_Spent, Time_Norm, Is_Completed, Link, Attachments)
        OUTPUT INSERTED.*
        VALUES 
          (@ID_Task, @ID_Employee, @Start_Date, @End_Date, @Description, @Hours_Spent, @Time_Norm, @Is_Completed, @Link, @Attachments)
      `);

    const insertedRecord = insertResult.recordset[0];

    // 3. Получение информации о задаче, проекте, сотруднике
    const infoResult = await pool
      .request()
      .input("ID_Task", sql.Int, taskName)
      .input("ID_User", sql.Int, tokenUser.id)
      .query(`
        SELECT 
          t.Task_Name,
          o.Order_Name,
          o.ID_Team,
          u.First_Name + ' ' + u.Last_Name AS EmployeeName
        FROM Tasks t
        JOIN Orders o ON t.ID_Order = o.ID_Order
        JOIN Users u ON u.ID_User = @ID_User
        WHERE t.ID_Task = @ID_Task
      `);

    const taskInfo = infoResult.recordset[0];

    // 4. Поиск email менеджера команды
    if (taskInfo) {
      const managerResult = await pool
        .request()
        .input("ID_Team", sql.Int, taskInfo.ID_Team)
        .query(`
          SELECT TOP 1 u.Email
          FROM TeamMembers tm
          JOIN Users u ON tm.ID_User = u.ID_User
          WHERE tm.ID_Team = @ID_Team AND u.ID_Role IN (
            SELECT ID_Role FROM Roles WHERE Role_Name LIKE N'%менеджер%'
          )
        `);

      const managerEmail = managerResult.recordset[0]?.Email;
      if (managerEmail) {
        await createNotification({
          userEmail: managerEmail,
          title: "Добавлена карточка времени",
          description: `Сотрудник ${taskInfo.EmployeeName} добавил время к задаче "${taskInfo.Task_Name}".`,
        });
      }
    }

    res.status(201).json({
      message: "Время добавлено",
      timeEntry: insertedRecord,
    });
  } catch (error) {
    console.error("Ошибка при добавлении:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const updateTimeEntry = async (req, res) => {
  const { id } = req.params;
  const { taskName, description, hours, date, link, attachments } = req.body;

  try {
    await poolConnect;

    const tokenUser = req.user;
    if (!tokenUser?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await pool
      .request()
      .input("ID_Execution", sql.Int, id)
      .input("ID_Task", sql.Int, parseInt(taskName))
      .input("Start_Date", sql.DateTime, new Date(date))
      .input("End_Date", sql.DateTime, new Date(date))
      .input("Description", sql.NVarChar(sql.MAX), description || "")
      .input("Hours_Spent", sql.Decimal(5, 2), hours)
      .input("Link", sql.NVarChar(sql.MAX), link || null)
      .input("Attachments", sql.NVarChar(sql.MAX), attachments ? attachments.join(",") : null)
      .query(`
        UPDATE Execution
        SET ID_Task = @ID_Task,
            Start_Date = @Start_Date,
            End_Date = @End_Date,
            Description = @Description,
            Hours_Spent = @Hours_Spent,
            Link = @Link,
            Attachments = @Attachments
        WHERE ID_Execution = @ID_Execution AND ID_Employee = ${tokenUser.id}
      `);

    res.status(200).json({ message: "Запись обновлена" });
  } catch (error) {
    console.error("Ошибка при обновлении:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};


// 🔹 Удалить запись учета времени
const deleteTimeEntry = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    const tokenUser = req.user;
    if (!tokenUser?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await pool
      .request()
      .input("ID_Execution", sql.Int, id)
      .input("ID_Employee", sql.Int, tokenUser.id).query(`
        DELETE FROM Execution WHERE ID_Execution = @ID_Execution AND ID_Employee = @ID_Employee
      `);

    res.status(200).json({ message: "Запись удалена" });
  } catch (error) {
    console.error("Ошибка при удалении:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const getTimeEntries = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    console.log("👉 userId:", userId, "👉 userRole:", userRole);

    if (!userId) {
      return res.status(401).json({ message: "Не авторизован" });
    }

    await poolConnect;

    let query = `
      SELECT 
        e.ID_Execution,
        e.ID_Task,
        t.Task_Name,
        o.Order_Name,
        e.Start_Date,
        e.End_Date,
        e.Hours_Spent,
        e.Description,
        e.Is_Completed,
        e.ID_Employee,
        e.Attachments,
        e.Link,
        t.Time_Norm,
        u.First_Name + ' ' + u.Last_Name AS Employee_Name,
        tms.Team_Name,
        (
          SELECT SUM(e2.Hours_Spent)
          FROM Execution e2
          WHERE e2.ID_Task = e.ID_Task 
            AND e2.ID_Employee = e.ID_Employee 
            AND e2.Is_Completed = 1
        ) AS Hours_Spent_Total,
        CASE 
          WHEN t.Time_Norm IS NOT NULL AND
               (
                 SELECT SUM(e2.Hours_Spent)
                 FROM Execution e2
                 WHERE e2.ID_Task = e.ID_Task 
                   AND e2.ID_Employee = e.ID_Employee
               ) <= t.Time_Norm THEN 1
          ELSE 0
        END AS FitTimeNorm
      FROM Execution e
      JOIN Tasks t ON e.ID_Task = t.ID_Task
      JOIN Orders o ON t.ID_Order = o.ID_Order
      JOIN Users u ON e.ID_Employee = u.ID_User
      LEFT JOIN TeamMembers tm ON u.ID_User = tm.ID_User
      LEFT JOIN Teams tms ON tm.ID_Team = tms.ID_Team
    `;

    if (userRole !== "менеджер") {
      query += ` WHERE e.ID_Employee = @ID_User`;
    }

    const result = await pool
      .request()
      .input("ID_User", sql.Int, userId)
      .query(query);

    const timeEntries = result.recordset.map((row) => ({
      ...row,
      Attachments: row.Attachments ? row.Attachments.split(",") : [],
    }));

    res.status(200).json(timeEntries);
  } catch (error) {
    console.error("Ошибка при получении:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const getAllTimeEntries = async (req, res) => {
  try {
    await poolConnect;
    const tokenUser = req.user;
    if (!tokenUser?.id || (tokenUser.role || '').toLowerCase() !== 'менеджер') {
      return res.status(403).json({ message: "Доступ запрещён" });
    }
    const result = await pool.request().query(`
      SELECT 
        e.ID_Execution,
        e.ID_Task,
        e.ID_Employee AS ID_User,
        t.Task_Name,
        o.Order_Name,
        e.Start_Date,
        e.End_Date,
        e.Hours_Spent,
        e.Description,
        e.Attachments,
        e.Link,
        e.Is_Completed,
        u.First_Name + ' ' + u.Last_Name AS Employee_Name,
        tms.Team_Name,
        t.Time_Norm,  -- добавляем!
        CASE 
          WHEN t.Time_Norm IS NOT NULL AND
               (
                 SELECT SUM(e2.Hours_Spent)
                 FROM Execution e2
                 WHERE e2.ID_Task = e.ID_Task 
                   AND e2.ID_Employee = e.ID_Employee
               ) <= t.Time_Norm THEN 1
          ELSE 0
        END AS FitTimeNorm
      FROM Execution e
      JOIN Tasks t ON e.ID_Task = t.ID_Task
      JOIN Orders o ON t.ID_Order = o.ID_Order
      JOIN Users u ON e.ID_Employee = u.ID_User
      LEFT JOIN TeamMembers tm ON u.ID_User = tm.ID_User
      LEFT JOIN Teams tms ON tm.ID_Team = tms.ID_Team
      ORDER BY e.Start_Date DESC
    `);
    
    
    const records = result.recordset.map((entry) => ({
      ...entry,
      Attachments: entry.Attachments
        ? entry.Attachments.split(",").map((s) => s.trim())
        : [],
      Time_Norm: entry.Time_Norm,  // добавлено!
      FitTimeNorm: entry.FitTimeNorm === 1  // приводим к boolean
    }));
    

    res.status(200).json(records);
  } catch (error) {
    console.error("Ошибка при получении всех записей:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};



module.exports = {
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntries,
  getAllTimeEntries  
};