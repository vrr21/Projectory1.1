const db = require('../config/db');

// Получение всех задач
exports.getAllTasks = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        t.ID_Task,
        t.Task_Name,
        t.Description,
        t.Time_Norm,
        s.Status_Name
      FROM Tasks t
      LEFT JOIN Statuses s ON t.ID_Status = s.ID_Status
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении всех задач:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получение задач сотрудника
exports.getEmployeeTasks = async (req, res) => {
  const employeeId = req.user?.id || req.query.employeeId; // используем либо authMiddleware, либо query

  try {
    const result = await db.query(`
      SELECT 
        t.ID_Task,
        t.Task_Name,
        t.Description,
        s.Status_Name,
        o.Order_Name,
        pt.Type_Name AS ProjectType,
        e.Start_Date,
        e.End_Date
      FROM Tasks t
      JOIN Statuses s ON t.ID_Status = s.ID_Status
      JOIN Orders o ON t.ID_Order = o.ID_Order
      JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
      JOIN Assignment a ON t.ID_Task = a.ID_Task
      LEFT JOIN Execution e ON t.ID_Task = e.ID_Task AND a.ID_Employee = e.ID_Employee
      WHERE a.ID_Employee = @employeeId
    `, { employeeId });

    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении задач сотрудника:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Создание задачи
exports.createTask = async (req, res) => {
  const { Task_Name, Description, Time_Norm, Status_Name } = req.body;

  try {
    const statusResult = await db.query(
      `SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name`,
      { Status_Name }
    );

    if (statusResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }

    const ID_Status = statusResult.recordset[0].ID_Status;

    await db.query(`
      INSERT INTO Tasks (Task_Name, Description, Time_Norm, ID_Status)
      VALUES (@Task_Name, @Description, @Time_Norm, @ID_Status)
    `, {
      Task_Name,
      Description,
      Time_Norm,
      ID_Status
    });

    res.status(201).json({ message: 'Задача успешно создана' });
  } catch (error) {
    console.error('Ошибка при создании задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Обновление задачи
exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { Task_Name, Description, Time_Norm, Status_Name } = req.body;

  try {
    const statusResult = await db.query(
      `SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name`,
      { Status_Name }
    );

    if (statusResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }

    const ID_Status = statusResult.recordset[0].ID_Status;

    await db.query(`
      UPDATE Tasks
      SET Task_Name = @Task_Name,
          Description = @Description,
          Time_Norm = @Time_Norm,
          ID_Status = @ID_Status
      WHERE ID_Task = @ID_Task
    `, {
      Task_Name,
      Description,
      Time_Norm,
      ID_Status,
      ID_Task: id
    });

    res.json({ message: 'Задача обновлена' });
  } catch (error) {
    console.error('Ошибка при обновлении задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Удаление задачи
exports.deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(`DELETE FROM Tasks WHERE ID_Task = @ID_Task`, {
      ID_Task: id
    });

    res.json({ message: 'Задача удалена' });
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
