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

// Добавление задачи
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
