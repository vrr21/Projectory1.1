const { pool, sql } = require('../config/db');
const docx = require('docx');
const {
  Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun
} = docx;

// Отчёт для сотрудника
exports.getEmployeeReport = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.request()
      .input('ID_User', sql.Int, id)
      .query(`
        SELECT 
          u.First_Name + ' ' + u.Last_Name AS Employee_Name,
          o.Order_Name,
          pt.Type_Name AS Project_Type,
          s.Status_Name,
          t.Task_Name,
          t.Description,
          t.Time_Norm,
          e.Start_Date,
          e.End_Date,
          e.Hours_Spent,
          YEAR(e.Start_Date) AS Year,
          MONTH(e.Start_Date) AS Month
        FROM Execution e
        JOIN Tasks t ON e.ID_Task = t.ID_Task
        JOIN Statuses s ON t.ID_Status = s.ID_Status
        JOIN Orders o ON t.ID_Order = o.ID_Order
        JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
        JOIN Users u ON e.ID_Employee = u.ID_User
        WHERE u.ID_User = @ID_User
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка получения отчёта:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Отчёт для менеджера (все данные)
exports.getManagerReport = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        u.First_Name + ' ' + u.Last_Name AS Employee_Name,
        o.Order_Name,
        pt.Type_Name AS Project_Type,
        s.Status_Name,
        t.Task_Name,
        t.Description,
        t.Time_Norm,
        e.Start_Date,
        e.End_Date,
        e.Hours_Spent,
        YEAR(e.Start_Date) AS Year,
        MONTH(e.Start_Date) AS Month,
        t.ID_Task
      FROM Execution e
      JOIN Tasks t ON e.ID_Task = t.ID_Task
      JOIN Statuses s ON t.ID_Status = s.ID_Status
      JOIN Orders o ON t.ID_Order = o.ID_Order
      JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
      JOIN Users u ON e.ID_Employee = u.ID_User
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка получения отчёта для менеджера:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Экспорт отчёта сотрудника в Word
exports.exportToWord = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.request()
      .input('ID_User', sql.Int, id)
      .query(`
        SELECT 
          u.First_Name + ' ' + u.Last_Name AS Employee_Name,
          o.Order_Name,
          pt.Type_Name AS Project_Type,
          s.Status_Name,
          t.Task_Name,
          t.Description,
          t.Time_Norm,
          e.Start_Date,
          e.End_Date,
          e.Hours_Spent,
          YEAR(e.Start_Date) AS Year,
          MONTH(e.Start_Date) AS Month
        FROM Execution e
        JOIN Tasks t ON e.ID_Task = t.ID_Task
        JOIN Statuses s ON t.ID_Status = s.ID_Status
        JOIN Orders o ON t.ID_Order = o.ID_Order
        JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
        JOIN Users u ON e.ID_Employee = u.ID_User
        WHERE u.ID_User = @ID_User
      `);

    const rows = result.recordset;
    const children = [];

    children.push(new Paragraph({
      text: "Отчёт по задачам сотрудника",
      heading: "Heading1",
      spacing: { after: 300 }
    }));

    if (rows && rows.length > 0) {
      const tableHeader = new TableRow({
        children: Object.keys(rows[0]).map(key =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
          })
        ),
      });

      const tableRows = rows.map(row =>
        new TableRow({
          children: Object.values(row).map(val =>
            new TableCell({
              children: [new Paragraph({ text: String(val ?? '') })],
            })
          ),
        })
      );

      children.push(new Table({ rows: [tableHeader, ...tableRows] }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Нет данных для отображения", bold: true })],
      }));
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Disposition', 'attachment; filename="employee-report.docx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error('Ошибка экспорта Word для сотрудника:', error);
    res.status(500).json({ message: 'Ошибка при экспорте отчета' });
  }
};
