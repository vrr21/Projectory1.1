const db = require("../config/db");
const { notifyProjectAssignment } = require('../services/notification.service');
const authMiddleware = require('../middleware/authMiddleware');


// Получение всех проектов с ID_Manager
// Получение всех проектов с ID_Manager
exports.getAllProjects = async (req, res) => {
  try {
    const result = await db.pool
      .request()
      .query(`
        SELECT 
  o.ID_Order, 
  o.Order_Name, 
  pt.Type_Name, 
  o.Creation_Date, 
  o.End_Date,
  o.Status,
  ISNULL(o.ID_Team, 0) AS ID_Team,
  ISNULL(t.Team_Name, 'Нет команды') AS Team_Name,
  ISNULL(o.ID_Manager, 0) AS ID_Manager
FROM Orders o
LEFT JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
LEFT JOIN Teams t ON o.ID_Team = t.ID_Team;

      `);

    res.json(result.recordset); // Возвращает все поля
  } catch (err) {
    console.error('Ошибка при получении проектов:', err);
    res.status(500).json({ error: 'Ошибка при получении проектов' });
  }
};


exports.createProject = async (req, res) => {
  const { Order_Name, Type_Name, Creation_Date, End_Date } = req.body;
  const ID_Manager = req.body.ID_Manager || req.user?.id; // 👈 Автоматическое назначение менеджера

  try {
    const typeResult = await db.pool
      .request()
      .input("Type_Name", db.sql.NVarChar, Type_Name)
      .query("SELECT ID_ProjectType FROM ProjectTypes WHERE Type_Name = @Type_Name");

    if (typeResult.recordset.length === 0) {
      return res.status(400).json({ error: "Тип проекта не найден" });
    }

    const typeId = typeResult.recordset[0].ID_ProjectType;

    await db.pool
      .request()
      .input("Order_Name", db.sql.NVarChar, Order_Name)
      .input("ID_ProjectType", db.sql.Int, typeId)
      .input("Creation_Date", db.sql.Date, Creation_Date)
      .input("End_Date", db.sql.Date, End_Date)
      .input("Status", db.sql.NVarChar, "Новая")
      .input("ID_Manager", db.sql.Int, ID_Manager)
      .query(`
        INSERT INTO Orders (Order_Name, ID_ProjectType, Creation_Date, End_Date, Status, ID_Manager)
        VALUES (@Order_Name, @ID_ProjectType, @Creation_Date, @End_Date, @Status, @ID_Manager)
      `);

    res.status(201).json({ message: "Проект успешно создан" });
  } catch (err) {
    console.error("Ошибка при создании проекта:", err);
    res.status(500).json({ error: "Ошибка при создании проекта" });
  }
};


// Закрытие проекта
exports.closeProject = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    // 1️⃣ Закрыть проект
    await pool.request()
      .input('ID_Order', sql.Int, id)
      .query("UPDATE Orders SET Status = 'Закрыт' WHERE ID_Order = @ID_Order");

    // 2️⃣ Найти ID статуса "Завершена"
    const statusResult = await pool.request()
      .input('Status_Name', sql.NVarChar, 'Завершена')
      .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name');

    if (!statusResult.recordset.length) {
      return res.status(400).json({ message: 'Статус "Завершена" не найден' });
    }

    const completedStatusId = statusResult.recordset[0].ID_Status;

    // 3️⃣ Обновить все незавершенные задачи проекта
    await pool.request()
      .input('ID_Order', sql.Int, id)
      .input('CompletedStatus', sql.Int, completedStatusId)
      .query(`
        UPDATE Tasks
        SET ID_Status = @CompletedStatus
        WHERE ID_Order = @ID_Order
        AND ID_Status IN (
          SELECT ID_Status FROM Statuses 
          WHERE Status_Name IN ('Новая', 'В работе')
        )
      `);

    res.status(200).json({ message: 'Проект закрыт и все незавершённые задачи завершены' });
  } catch (error) {
    console.error("🔥 Ошибка при закрытии проекта:", error);
    res.status(500).json({ message: 'Ошибка при закрытии проекта', error: error.message });
  }
};


// Обновление проекта
exports.updateProject = async (req, res) => {
  const projectId = req.params.id;
  const { Order_Name, Type_Name, Creation_Date, End_Date } = req.body;

  try {
    const typeResult = await db.pool
      .request()
      .input("Type_Name", db.sql.NVarChar, Type_Name)
      .query("SELECT ID_ProjectType FROM ProjectTypes WHERE Type_Name = @Type_Name");

    if (typeResult.recordset.length === 0) {
      return res.status(400).json({ error: "Тип проекта не найден" });
    }

    const typeId = typeResult.recordset[0].ID_ProjectType;

    await db.pool
      .request()
      .input("ID_Order", db.sql.Int, projectId)
      .input("Order_Name", db.sql.NVarChar, Order_Name)
      .input("ID_ProjectType", db.sql.Int, typeId)
      .input("Creation_Date", db.sql.Date, Creation_Date)
      .input("End_Date", db.sql.Date, End_Date)
      .query(`
        UPDATE Orders
        SET Order_Name = @Order_Name,
            ID_ProjectType = @ID_ProjectType,
            Creation_Date = @Creation_Date,
            End_Date = @End_Date
        WHERE ID_Order = @ID_Order
      `);

    res.json({ message: "Проект обновлён" });
  } catch (err) {
    console.error("Ошибка при обновлении проекта:", err);
    res.status(500).json({ error: "Ошибка при обновлении проекта" });
  }
};

// Удаление проекта
exports.deleteProject = async (req, res) => {
  const projectId = req.params.id;

  try {
    await db.pool
      .request()
      .input("ID_Order", db.sql.Int, projectId)
      .query("DELETE FROM Orders WHERE ID_Order = @ID_Order");

    res.json({ message: "Проект удалён" });
  } catch (err) {
    console.error("Ошибка при удалении проекта:", err);
    res.status(500).json({ error: "Ошибка при удалении проекта" });
  }
};

exports.assignEmployeeToProject = async (req, res) => {
  const { ID_Order, employeeIds = [] } = req.body;

  if (!ID_Order || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return res.status(400).json({ message: 'ID проекта и ID сотрудников обязательны' });
  }

  try {
    await poolConnect;

    const projectResult = await pool.request()
      .input('ID_Order', sql.Int, ID_Order)
      .query('SELECT Order_Name FROM Orders WHERE ID_Order = @ID_Order');

    if (!projectResult.recordset.length) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    const projectName = projectResult.recordset[0].Order_Name;

    for (const empId of employeeIds) {
      await pool.request()
        .input('ID_Order', sql.Int, ID_Order)
        .input('ID_Employee', sql.Int, empId)
        .query(`
          INSERT INTO ProjectAssignments (ID_Order, ID_Employee)
          VALUES (@ID_Order, @ID_Employee)
        `);

      console.log(`📨 Назначен сотрудник ${empId} на проект "${projectName}"`);

      await notifyProjectAssignment(empId, projectName); // ✅ уведомление
    }

    res.status(200).json({ message: 'Сотрудники добавлены в проект и уведомлены' });
  } catch (error) {
    console.error('❌ Ошибка при назначении сотрудников на проект:', error);
    res.status(500).json({ message: 'Ошибка сервера при назначении сотрудников' });
  }
};

// project.controller.js
exports.getProjectsByTeam = async (req, res) => {
  const { teamId } = req.query;

  if (!teamId) {
    return res.status(400).json({ message: 'Не передан параметр teamId' });
  }

  try {
    await db.poolConnect;

    const result = await db.pool
    .request()
    .input('TeamID', db.sql.Int, parseInt(teamId, 10))
    .query(`
      SELECT o.ID_Order, o.Order_Name, o.Status
      FROM Orders o
      WHERE o.ID_Team = @TeamID AND o.Status != 'Закрыт'
    `);
  
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении проектов по команде:', error);
    res.status(500).json({ message: 'Ошибка при получении проектов по команде' });
  }
};


exports.getProjectById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.pool
      .request()
      .input('ID_Order', db.sql.Int, id)
      .query(`
        SELECT 
          ID_Order,
          Order_Name,
          End_Date,
          ID_Manager
        FROM Orders
        WHERE ID_Order = @ID_Order
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Ошибка при получении проекта:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении проекта' });
  }
};
