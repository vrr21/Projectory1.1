const db = require('../config/db');

exports.getEmployeeTasks = async (req, res) => {
  const employeeId = req.user.id; // Предполагается, что ID пользователя доступен в req.user

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
    `, {
      employeeId
    });

    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении задач сотрудника:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
