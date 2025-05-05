const { sql, poolConnect, pool } = require('../config/db');

// Добавить запись учета времени
const createTimeEntry = async (req, res) => {
  const { taskName, description, hours, date } = req.body;

  try {
    await poolConnect;

    const tokenUser = req.user;
    if (!tokenUser?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await pool.request()
      .input('ID_Task', sql.Int, taskName)
      .input('ID_Employee', sql.Int, tokenUser.id)
      .input('Start_Date', sql.DateTime, new Date(date))
      .input('End_Date', sql.DateTime, new Date(date))
      .input('Description', sql.NVarChar(sql.MAX), description || '')
      .input('Hours_Spent', sql.Decimal(5, 2), hours)
      .query(`
        INSERT INTO Execution (ID_Task, ID_Employee, Start_Date, End_Date, Description, Hours_Spent)
        VALUES (@ID_Task, @ID_Employee, @Start_Date, @End_Date, @Description, @Hours_Spent)
      `);

    res.status(201).json({ message: 'Время добавлено' });
  } catch (error) {
    console.error('Ошибка при добавлении:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Обновить запись учета времени
const updateTimeEntry = async (req, res) => {
  const { id } = req.params;
  const { taskName, description, hours, date } = req.body;

  try {
    await poolConnect;

    const tokenUser = req.user;
    if (!tokenUser?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await pool.request()
      .input('ID_Execution', sql.Int, id)
      .input('ID_Task', sql.Int, taskName)
      .input('Start_Date', sql.DateTime, new Date(date))
      .input('End_Date', sql.DateTime, new Date(date))
      .input('Description', sql.NVarChar(sql.MAX), description || '')
      .input('Hours_Spent', sql.Decimal(5, 2), hours)
      .query(`
        UPDATE Execution
        SET ID_Task = @ID_Task,
            Start_Date = @Start_Date,
            End_Date = @End_Date,
            Description = @Description,
            Hours_Spent = @Hours_Spent
        WHERE ID_Execution = @ID_Execution AND ID_Employee = ${tokenUser.id}
      `);

    res.status(200).json({ message: 'Запись обновлена' });
  } catch (error) {
    console.error('Ошибка при обновлении:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получить все записи времени
const getTimeEntries = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const result = await pool.request()
    .query(`
      SELECT 
        e.ID_Execution,
        e.ID_Task,
        t.Task_Name,
        o.Order_Name,
        e.Start_Date,
        e.End_Date,
        e.Hours_Spent,
        e.Description,
        u.ID_User, -- добавлено
        u.First_Name + ' ' + u.Last_Name AS Employee_Name,
        tm.Team_Name
      FROM Execution e
      INNER JOIN Tasks t ON e.ID_Task = t.ID_Task
      INNER JOIN Orders o ON t.ID_Order = o.ID_Order
      INNER JOIN Users u ON e.ID_Employee = u.ID_User
      INNER JOIN Teams tm ON o.ID_Team = tm.ID_Team
    `);
  

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

module.exports = {
  createTimeEntry,
  updateTimeEntry,
  getTimeEntries
};
