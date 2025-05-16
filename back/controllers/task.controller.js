const { pool, sql, poolConnect } = require('../config/db');

// 🔹 Получение задач с фильтрацией
exports.getAllTasks = async (req, res) => {
  const { employee, team } = req.query;

  try {
    await poolConnect;
    const request = pool.request();
    if (employee) request.input('EmployeeID', sql.Int, parseInt(employee));
    if (team) request.input('TeamID', sql.Int, parseInt(team));

    const result = await request.query(`
      SELECT 
        t.ID_Task,
        t.Task_Name,
        t.Description,
        t.Time_Norm,
        t.Deadline,
        s.Status_Name,
        o.Order_Name,
        tm.Team_Name,
        u.ID_User,
        u.First_Name + ' ' + u.Last_Name AS Employee_Name,
        u.Avatar
      FROM Tasks t
      INNER JOIN Statuses s ON t.ID_Status = s.ID_Status
      INNER JOIN Orders o ON t.ID_Order = o.ID_Order
      INNER JOIN Teams tm ON o.ID_Team = tm.ID_Team
      LEFT JOIN Assignment a ON t.ID_Task = a.ID_Task
      LEFT JOIN Users u ON a.ID_Employee = u.ID_User
      WHERE 1=1
      ${employee ? 'AND EXISTS (SELECT 1 FROM Assignment a2 WHERE a2.ID_Task = t.ID_Task AND a2.ID_Employee = @EmployeeID)' : ''}
      ${team ? 'AND tm.ID_Team = @TeamID' : ''}
    `);

    const tasks = Object.values(
      result.recordset.reduce((acc, row) => {
        if (!acc[row.ID_Task]) {
          acc[row.ID_Task] = {
            ID_Task: row.ID_Task,
            Task_Name: row.Task_Name,
            Description: row.Description,
            Time_Norm: row.Time_Norm,
            Deadline: row.Deadline,
            Status_Name: row.Status_Name,
            Order_Name: row.Order_Name,
            Team_Name: row.Team_Name,
            Employees: []
          };
        }
        if (row.ID_User && row.Employee_Name) {
          acc[row.ID_Task].Employees.push({
            ID_Employee: row.ID_User,
            Full_Name: row.Employee_Name,
            Avatar: row.Avatar ?? null
          });
        }
        return acc;
      }, {})
    );

    res.status(200).json(tasks);
  } catch (error) {
    console.error('🔥 Ошибка при получении задач:', error);
    res.status(500).json({ message: 'Ошибка при получении задач', error: error.message });
  }
};

// 🔹 Создание задачи с уведомлением
exports.createTask = async (req, res) => {
  const { Task_Name, Description, Time_Norm, ID_Status, ID_Order, Deadline, Employee_Names = [] } = req.body;

  try {
    await poolConnect;

    if (!ID_Status) return res.status(400).json({ message: 'ID_Status обязателен' });

    const insertTaskResult = await pool.request()
      .input('Task_Name', sql.NVarChar, Task_Name)
      .input('Description', sql.NVarChar, Description)
      .input('Time_Norm', sql.Int, Time_Norm)
      .input('ID_Status', sql.Int, ID_Status)
      .input('ID_Order', sql.Int, ID_Order)
      .input('Deadline', sql.DateTime, Deadline || null)
      .query(`
        INSERT INTO Tasks (Task_Name, Description, Time_Norm, ID_Status, ID_Order, Deadline)
        OUTPUT INSERTED.ID_Task
        VALUES (@Task_Name, @Description, @Time_Norm, @ID_Status, @ID_Order, @Deadline)
      `);

    const ID_Task = insertTaskResult.recordset[0].ID_Task;

    for (const name of Employee_Names) {
      const [First_Name, Last_Name] = name.split(' ');
      const userResult = await pool.request()
        .input('First_Name', sql.NVarChar, First_Name)
        .input('Last_Name', sql.NVarChar, Last_Name)
        .query('SELECT ID_User, Email FROM Users WHERE First_Name = @First_Name AND Last_Name = @Last_Name');

      if (userResult.recordset.length) {
        const { ID_User, Email } = userResult.recordset[0];

        await pool.request()
          .input('ID_Task', sql.Int, ID_Task)
          .input('ID_Employee', sql.Int, ID_User)
          .input('Assignment_Date', sql.Date, new Date())
          .query(`
            INSERT INTO Assignment (ID_Task, ID_Employee, Assignment_Date)
            VALUES (@ID_Task, @ID_Employee, @Assignment_Date)
          `);

        await pool.request()
          .input('Title', sql.NVarChar, 'Назначена новая задача')
          .input('Description', sql.NVarChar, `Вам назначена задача "${Task_Name}"`)
          .input('UserEmail', sql.NVarChar, Email)
          .query(`
            INSERT INTO Notifications (Title, Description, UserEmail)
            VALUES (@Title, @Description, @UserEmail)
          `);
      }
    }

    res.status(201).json({ message: 'Задача и уведомления успешно созданы' });
  } catch (error) {
    console.error('🔥 Ошибка при создании задачи:', error);
    res.status(500).json({ message: 'Ошибка при создании задачи', error: error.message });
  }
};

// 🔹 Обновление задачи
exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { Task_Name, Description, Time_Norm, Status_Name, ID_Status, ID_Order, Deadline } = req.body;

  try {
    await poolConnect;

    let resolvedStatusId = ID_Status;
    if (!resolvedStatusId && Status_Name) {
      const statusResult = await pool.request()
        .input('Status_Name', sql.NVarChar, Status_Name)
        .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name');
      if (!statusResult.recordset.length) {
        return res.status(400).json({ message: 'Недопустимый статус' });
      }
      resolvedStatusId = statusResult.recordset[0].ID_Status;
    }

    if (!resolvedStatusId) {
      return res.status(400).json({ message: 'Статус задачи обязателен (ID_Status или Status_Name)' });
    }

    const fields = [];
    const request = pool.request().input('ID_Task', sql.Int, id);

    if (Task_Name !== undefined) {
      fields.push('Task_Name = @Task_Name');
      request.input('Task_Name', sql.NVarChar, Task_Name);
    }
    if (Description !== undefined) {
      fields.push('Description = @Description');
      request.input('Description', sql.NVarChar, Description);
    }
    if (Time_Norm !== undefined) {
      fields.push('Time_Norm = @Time_Norm');
      request.input('Time_Norm', sql.Int, Time_Norm);
    }
    if (ID_Order !== undefined) {
      fields.push('ID_Order = @ID_Order');
      request.input('ID_Order', sql.Int, ID_Order);
    }
    if (Deadline !== undefined) {
      fields.push('Deadline = @Deadline');
      request.input('Deadline', sql.DateTime, Deadline);
    }

    fields.push('ID_Status = @ID_Status');
    request.input('ID_Status', sql.Int, resolvedStatusId);

    if (!fields.length) {
      return res.status(400).json({ message: 'Нет полей для обновления' });
    }

    const query = `UPDATE Tasks SET ${fields.join(', ')} WHERE ID_Task = @ID_Task`;
    await request.query(query);

    res.status(200).json({ message: 'Задача успешно обновлена' });
  } catch (error) {
    console.error('🔥 Ошибка при обновлении задачи:', error);
    res.status(500).json({ message: 'Ошибка при обновлении задачи', error: error.message });
  }
};

// 🔹 Удаление задачи
exports.deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;
    await pool.request().input('ID_Task', sql.Int, id)
      .query('DELETE FROM Assignment WHERE ID_Task = @ID_Task');
    await pool.request().input('ID_Task', sql.Int, id)
      .query('DELETE FROM Tasks WHERE ID_Task = @ID_Task');

    res.status(200).json({ message: 'Задача и назначения успешно удалены' });
  } catch (error) {
    console.error('🔥 Ошибка при удалении задачи:', error);
    res.status(500).json({ message: 'Ошибка при удалении задачи', error: error.message });
  }
};

// 🔹 Получение задач по сотруднику
exports.getTasksByEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;
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
    console.error('🔥 Ошибка при получении задач сотрудника:', error);
    res.status(500).json({ message: 'Ошибка при получении задач сотрудника', error: error.message });
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
        u.ID_User,
        u.First_Name + ' ' + u.Last_Name AS Employee_Name,
        u.Avatar
      FROM Tasks t
      LEFT JOIN Statuses s ON t.ID_Status = s.ID_Status
      LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
      LEFT JOIN Teams tm ON o.ID_Team = tm.ID_Team
      LEFT JOIN Assignment a ON t.ID_Task = a.ID_Task
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
            Deadline: row.Deadline,
            Status_Name: row.Status_Name,
            Order_Name: row.Order_Name,
            ID_Order: row.ID_Order,
            Team_Name: row.Team_Name,
            Employees: []
          };
        }
        if (row.ID_User && row.Employee_Name) {
          acc[row.ID_Task].Employees.push({
            id: row.ID_User,
            fullName: row.Employee_Name,
            avatar: row.Avatar ?? null
          });
        }
        return acc;
      }, {})
    );

    res.json(tasks);
  } catch (error) {
    console.error('🔥 Ошибка при получении задач с деталями:', error);
    res.status(500).json({ message: 'Ошибка при получении задач с деталями', error: error.message });
  }
};
// 🔹 Закрытие задачи
exports.closeTask = async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    // Получить ID статуса "Завершена"
    const statusResult = await pool.request()
      .input('Status_Name', sql.NVarChar, 'Завершена')
      .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name');

    if (!statusResult.recordset.length) {
      return res.status(400).json({ message: 'Статус "Завершена" не найден' });
    }

    const completedStatusId = statusResult.recordset[0].ID_Status;

    // Обновить задачу, установив статус "Завершена"
    await pool.request()
      .input('ID_Task', sql.Int, id)
      .input('ID_Status', sql.Int, completedStatusId)
      .query('UPDATE Tasks SET ID_Status = @ID_Status WHERE ID_Task = @ID_Task');

    res.status(200).json({ message: 'Задача успешно закрыта' });
  } catch (error) {
    console.error('🔥 Ошибка при закрытии задачи:', error);
    res.status(500).json({ message: 'Ошибка при закрытии задачи', error: error.message });
  }
};
// 🔹 Обновление статуса задачи для конкретного сотрудника
exports.updateEmployeeTaskStatus = async (req, res) => {
  const { taskId } = req.params;
  const { employeeId, statusName } = req.body;

  if (!employeeId || !statusName) {
    return res.status(400).json({ message: 'employeeId и statusName обязательны' });
  }

  try {
    await poolConnect;

    // Найти ID статуса по имени
    const statusResult = await pool.request()
      .input('Status_Name', sql.NVarChar, statusName)
      .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name');

    if (!statusResult.recordset.length) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }

    const statusId = statusResult.recordset[0].ID_Status;

    // Обновить статус в таблице Assignment для конкретного сотрудника и задачи
// Обновить статус в таблице Assignment для конкретного сотрудника и задачи
await pool.request()
  .input('ID_Task', sql.Int, taskId)
  .input('ID_Employee', sql.Int, employeeId)
  .input('ID_Status', sql.Int, statusId)
  .query(`
    UPDATE Assignment
    SET ID_Status = @ID_Status
    WHERE ID_Task = @ID_Task AND ID_Employee = @ID_Employee
  `);

// ✅ Также обновить общий статус в таблице Tasks
await pool.request()
  .input('ID_Task', sql.Int, taskId)
  .input('ID_Status', sql.Int, statusId)
  .query(`
    UPDATE Tasks
    SET ID_Status = @ID_Status
    WHERE ID_Task = @ID_Task
  `);


    res.status(200).json({ message: 'Статус задачи для сотрудника обновлен' });
  } catch (error) {
    console.error('🔥 Ошибка при обновлении статуса задачи сотрудника:', error);
    res.status(500).json({ message: 'Ошибка при обновлении статуса задачи сотрудника', error: error.message });
  }
};
