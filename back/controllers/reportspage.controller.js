const { sql, poolConnect } = require('../config/db');

// 📊 Статистика задач по дедлайнам (исключает пустые даты и нулевые количества)
const getOrdersStats = async (req, res) => {
  try {
    const pool = await poolConnect;
    const result = await pool.request().query(`
      SELECT 
        CONVERT(VARCHAR(10), Tasks.Deadline, 120) AS TaskDate,
        COUNT(Tasks.ID_Task) AS Total_Tasks
      FROM Tasks
      WHERE Tasks.Deadline IS NOT NULL AND TRY_CONVERT(DATE, Tasks.Deadline) IS NOT NULL
      GROUP BY CONVERT(VARCHAR(10), Tasks.Deadline, 120)
    `);

    const data = result.recordset.filter(
      r => typeof r.TaskDate === 'string' && r.TaskDate.trim() !== '' &&
           typeof r.Total_Tasks === 'number' && r.Total_Tasks > 0
    );

    res.status(200).json(data);
  } catch (error) {
    console.error('Ошибка при получении статистики задач по дедлайнам:', error);
    res.status(500).json({ error: 'Ошибка при загрузке статистики задач по дедлайнам' });
  }
};

// 🕑 Часы по сотрудникам (исключает пустые имена и нулевые часы)
// 🕑 Часы по сотрудникам
const getEmployeeHours = async (req, res) => {
  try {
    const pool = await poolConnect;
    const result = await pool.request().query(`
      SELECT Employee_Name, Total_Hours
      FROM EmployeeHoursReport
      WHERE Employee_Name IS NOT NULL AND Employee_Name <> '' AND Total_Hours IS NOT NULL AND Total_Hours > 0
    `);

    const data = result.recordset.map(r => ({
      Employee_Name: r.Employee_Name || 'Неизвестный сотрудник',
      Total_Hours: r.Total_Hours || 0
    }));

    res.status(200).json(data);
  } catch (error) {
    console.error('Ошибка при получении часов сотрудников:', error);
    res.status(500).json({ error: 'Ошибка при загрузке часов сотрудников' });
  }
};


// 📌 Сводка по статусам задач (исключает пустые статусы и нулевые количества)
const getTaskStatusSummary = async (req, res) => {
  try {
    const pool = await poolConnect;
    const result = await pool.request().query(`
      SELECT Status_Name, Task_Count
      FROM TaskStatusSummary
      WHERE Status_Name IS NOT NULL AND Status_Name <> '' AND Task_Count IS NOT NULL AND Task_Count > 0
    `);

    const data = result.recordset.filter(
      r => typeof r.Status_Name === 'string' && r.Status_Name.trim() !== '' &&
           typeof r.Task_Count === 'number' && r.Task_Count > 0
    );

    res.status(200).json(data);
  } catch (error) {
    console.error('Ошибка при получении TaskStatusSummary:', error);
    res.status(500).json({ error: 'Ошибка при загрузке статистики статусов' });
  }
};

module.exports = {
  getOrdersStats,
  getEmployeeHours,
  getTaskStatusSummary,
};
