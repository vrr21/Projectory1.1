const { pool, sql } = require('../config/db');

// Получить все задачи или по фильтрам: ?employee=2&team=1
exports.getAllTasks = async (req, res) => {
  const { employee, team } = req.query;

  try {
    const request = pool.request();

    if (employee) {
      request.input('EmployeeID', sql.Int, parseInt(employee, 10));
    }

    if (team) {
      request.input('TeamID', sql.Int, parseInt(team, 10));
    }

    let baseQuery = `
      SELECT 
        t.ID_Task,
        t.Task_Name,
        t.Description,
        t.Time_Norm,
        s.Status_Name,
        o.Order_Name,
        tm.Team_Name
      FROM Assignment a
      INNER JOIN Tasks t ON a.ID_Task = t.ID_Task
      INNER JOIN Statuses s ON t.ID_Status = s.ID_Status
      INNER JOIN Orders o ON t.ID_Order = o.ID_Order
      INNER JOIN Teams tm ON o.ID_Team = tm.ID_Team
    `;

    const where = [];

    if (employee) where.push('a.ID_Employee = @EmployeeID');
    if (team) where.push('tm.ID_Team = @TeamID');

    if (where.length > 0) {
      baseQuery += ' WHERE ' + where.join(' AND ');
    }

    const result = await request.query(baseQuery);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении задач:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Создание задачи
exports.createTask = async (req, res) => {
  const { Task_Name, Description, Time_Norm, Status_Name, ID_Order, Employee_Name } = req.body;

  try {
    const statusResult = await pool.request()
      .input('Status_Name', sql.NVarChar, Status_Name)
      .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name');

    if (statusResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }

    const ID_Status = statusResult.recordset[0].ID_Status;

    const insertTaskResult = await pool.request()
      .input('Task_Name', sql.NVarChar, Task_Name)
      .input('Description', sql.NVarChar, Description)
      .input('Time_Norm', sql.Int, Time_Norm)
      .input('ID_Status', sql.Int, ID_Status)
      .input('ID_Order', sql.Int, ID_Order)
      .query(`
        INSERT INTO Tasks (Task_Name, Description, Time_Norm, ID_Status, ID_Order)
        OUTPUT INSERTED.ID_Task
        VALUES (@Task_Name, @Description, @Time_Norm, @ID_Status, @ID_Order)
      `);

    const ID_Task = insertTaskResult.recordset[0].ID_Task;

    if (Employee_Name) {
      const [First_Name, Last_Name] = Employee_Name.split(' ');
      const userResult = await pool.request()
        .input('First_Name', sql.NVarChar, First_Name)
        .input('Last_Name', sql.NVarChar, Last_Name)
        .query('SELECT ID_User FROM Users WHERE First_Name = @First_Name AND Last_Name = @Last_Name');

      if (userResult.recordset.length > 0) {
        const ID_User = userResult.recordset[0].ID_User;
        await pool.request()
          .input('ID_Task', sql.Int, ID_Task)
          .input('ID_Employee', sql.Int, ID_User)
          .input('Assignment_Date', sql.Date, new Date())
          .query(`
            INSERT INTO Assignment (ID_Task, ID_Employee, Assignment_Date)
            VALUES (@ID_Task, @ID_Employee, @Assignment_Date)
          `);
      }
    }

    res.status(201).json({ message: 'Задача успешно создана' });
  } catch (error) {
    console.error('Ошибка при создании задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Обновление задачи
exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { Status_Name } = req.body;

  try {
    const statusResult = await pool.request()
      .input('Status_Name', sql.NVarChar, Status_Name)
      .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name');

    if (statusResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }

    const ID_Status = statusResult.recordset[0].ID_Status;

    await pool.request()
      .input('ID_Status', sql.Int, ID_Status)
      .input('ID_Task', sql.Int, id)
      .query(`
        UPDATE Tasks
        SET ID_Status = @ID_Status
        WHERE ID_Task = @ID_Task
      `);

    res.status(200).json({ message: 'Статус задачи успешно обновлен' });
  } catch (error) {
    console.error('Ошибка при обновлении задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Удаление задачи
exports.deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.request()
      .input('ID_Task', sql.Int, id)
      .query('DELETE FROM Tasks WHERE ID_Task = @ID_Task');

    res.status(200).json({ message: 'Задача успешно удалена' });
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получение задач по ID сотрудника
exports.getTasksByEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.request()
      .input('ID_User', sql.Int, id)
      .query(`
        SELECT 
          t.ID_Task,
          t.Task_Name,
          t.Description,
          s.Status_Name,
          o.Order_Name,
          tm.Team_Name,
          t.Time_Norm
        FROM Assignment a
        INNER JOIN Tasks t ON a.ID_Task = t.ID_Task
        INNER JOIN Statuses s ON t.ID_Status = s.ID_Status
        INNER JOIN Orders o ON t.ID_Order = o.ID_Order
        INNER JOIN Teams tm ON o.ID_Team = tm.ID_Team
        WHERE a.ID_Employee = @ID_User
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении задач сотрудника:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
