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
        TRIM(s.Status_Name) as Status_Name,  -- <<< вот здесь
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
      AND s.Status_Name != 'Архив'
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


// 🔹 Создание задачи с уведомлением (исправлено)
// 🔹 Создание задачи с уведомлением (исправлено)
exports.createTask = async (req, res) => {
  const { Task_Name, Description, Time_Norm, ID_Order, Deadline, Employee_Names = [], ID_Manager: providedManager } = req.body;

  let ID_Manager = providedManager;

  try {
    await poolConnect;

    // Получить ID менеджера, если не указан
    if (!ID_Manager && ID_Order) {
      const managerResult = await pool.request()
        .input('ID_Order', sql.Int, ID_Order)
        .query('SELECT ID_Manager FROM Orders WHERE ID_Order = @ID_Order');

      if (managerResult.recordset.length) {
        ID_Manager = managerResult.recordset[0].ID_Manager;
      }
    }

    if (!ID_Manager) {
      return res.status(400).json({ message: 'ID менеджера обязателен для создания задачи' });
    }

    // Получаем ID статуса "Новая"
    const statusResult = await pool.request()
      .input('Status_Name', sql.NVarChar, 'Новая')
      .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name');

    if (!statusResult.recordset.length) {
      return res.status(400).json({ message: 'Статус "Новая" не найден в базе данных' });
    }

    const resolvedStatusId = statusResult.recordset[0].ID_Status;

    const insertTaskResult = await pool.request()
      .input('Task_Name', sql.NVarChar, Task_Name)
      .input('Description', sql.NVarChar, Description)
      .input('Time_Norm', sql.Int, Time_Norm)
      .input('ID_Status', sql.Int, resolvedStatusId)
      .input('ID_Order', sql.Int, ID_Order)
      .input('Deadline', sql.DateTime, Deadline ? new Date(Deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      .input('ID_Manager', sql.Int, ID_Manager)
      .query(`
        INSERT INTO Tasks (Task_Name, Description, Time_Norm, ID_Status, ID_Order, Deadline, ID_Manager)
        OUTPUT INSERTED.ID_Task
        VALUES (@Task_Name, @Description, @Time_Norm, @ID_Status, @ID_Order, @Deadline, @ID_Manager)
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
          .input('ID_Status', sql.Int, resolvedStatusId)
          .query(`
            INSERT INTO Assignment (ID_Task, ID_Employee, Assignment_Date, ID_Status)
            VALUES (@ID_Task, @ID_Employee, @Assignment_Date, @ID_Status)
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
// Получение задач по сотруднику с проверкой ID
exports.getTasksByEmployee = async (req, res) => {
  const { id } = req.params;

  const employeeId = parseInt(id, 10);

  if (!employeeId || isNaN(employeeId)) {
    console.error('Некорректный ID сотрудника:', id);
    return res.status(400).json({ message: 'Некорректный ID сотрудника' });
  }

  try {
    await poolConnect;
    const result = await pool.request()
    .input('ID_User', sql.Int, employeeId)
    .query(`
      SELECT 
        t.ID_Task,
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
      LEFT JOIN Assignment a2 ON t.ID_Task = a2.ID_Task
      LEFT JOIN Users u ON a2.ID_Employee = u.ID_User
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
      WHERE s.Status_Name != 'Архив'
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
    const statusResult = await pool.request()
      .input('Status_Name', sql.NVarChar, 'Архив')
      .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name');

    if (!statusResult.recordset.length) {
      return res.status(404).json({ message: 'Статус "Архив" не найден' });
    }

    const archiveStatusId = statusResult.recordset[0].ID_Status;

    // Удаление из Assignment
    await pool.request()
      .input('ID_Status', sql.Int, archiveStatusId)
      .query('DELETE FROM Assignment WHERE ID_Task IN (SELECT ID_Task FROM Tasks WHERE ID_Status = @ID_Status)');

    // Удаление из Tasks
    await pool.request()
      .input('ID_Status', sql.Int, archiveStatusId)
      .query('DELETE FROM Tasks WHERE ID_Status = @ID_Status');

    res.status(200).json({ message: 'Все архивные задачи удалены' });
  } catch (error) {
    console.error('🔥 Ошибка при удалении архивных задач:', error);
    res.status(500).json({ message: 'Ошибка при удалении архивных задач', error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { Task_Name, Description, Time_Norm, ID_Order, Deadline, ID_Status } = req.body;

  try {
    await poolConnect;

    if (!Task_Name || !Description || !Time_Norm || !ID_Order || !Deadline) {
      return res.status(200).end();
    }

    await pool.request()
      .input('ID_Task', sql.Int, id)
      .input('Task_Name', sql.NVarChar, Task_Name)
      .input('Description', sql.NVarChar, Description)
      .input('Time_Norm', sql.Int, Time_Norm)
      .input('ID_Order', sql.Int, ID_Order)
      .input('Deadline', sql.DateTime, new Date(Deadline))
      .input('ID_Status', sql.Int, ID_Status)
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
    console.error('🔥 Ошибка при обновлении задачи:', error);
    res.status(200).json({ message: `Обновление задачи ${id} завершилось с ошибкой, но ошибка подавлена` });
  }
};



module.exports = {
  getAllTasks: exports.getAllTasks,
  createTask: exports.createTask,
  deleteTask: exports.deleteTask,
  getTasksByEmployee: exports.getTasksByEmployee,
  getTasksWithDetails: exports.getTasksWithDetails,
  closeTask: exports.closeTask,
  updateEmployeeTaskStatus: exports.updateEmployeeTaskStatus,
  deleteAllArchivedTasks: exports.deleteAllArchivedTasks,
  updateTask: exports.updateTask,
};
