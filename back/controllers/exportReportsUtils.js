const ExcelJS = require('exceljs');
const { poolConnect, pool } = require('../config/db');

async function exportReportsToExcel(res) {
  try {
    await poolConnect;

    const employeeHoursResult = await pool.request().query('SELECT * FROM EmployeeHoursReport');
    const statusSummaryResult = await pool.request().query('SELECT * FROM TaskStatusSummary');
    const ordersStatsResult = await pool.request().query(`
      SELECT Creation_Date, COUNT(ID_Task) AS Total_Tasks 
      FROM Tasks 
      INNER JOIN Orders ON Tasks.ID_Order = Orders.ID_Order 
      GROUP BY Creation_Date
    `);

    const workbook = new ExcelJS.Workbook();

    // Вкладка 1: Потраченные часы
    const hoursSheet = workbook.addWorksheet('Потраченные часы');
    hoursSheet.addRow(['Сотрудник', 'Часы']);
    employeeHoursResult.recordset.forEach(r => hoursSheet.addRow([r.Employee_Name, r.Total_Hours]));

    // Вкладка 2: Статусы задач
    const statusSheet = workbook.addWorksheet('Статусы задач');
    statusSheet.addRow(['Статус', 'Кол-во задач']);
    statusSummaryResult.recordset.forEach(r => statusSheet.addRow([r.Status_Name, r.Task_Count]));

    // Вкладка 3: Задачи по датам
    const ordersSheet = workbook.addWorksheet('Задачи по датам');
    ordersSheet.addRow(['Дата создания', 'Кол-во задач']);
    ordersStatsResult.recordset.forEach(r => ordersSheet.addRow([r.Creation_Date, r.Total_Tasks]));

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reports.xlsx"');
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('Ошибка при создании Excel отчёта:', error);
    res.status(500).send('Ошибка при создании Excel отчёта');
  }
}

module.exports = { exportReportsToExcel };
