const { pool, sql } = require('../config/db');
const docx = require('docx');
const {
  Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun
} = docx;

exports.getEmployeeReport = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.request()
      .input('ID_User', sql.Int, id)
      .query(`
        SELECT * FROM EmployeeTaskExecution 
        WHERE Employee_Name IN (
          SELECT First_Name + ' ' + Last_Name FROM Users WHERE ID_User = @ID_User
        )
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка получения отчёта:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.getManagerReport = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT * FROM EmployeeTaskExecution
    `);
    res.json(result.recordset); // Для менеджера получаем все данные
  } catch (error) {
    console.error('Ошибка получения отчёта для менеджера:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.exportToWord = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.request()
      .input('ID_User', sql.Int, id)
      .query(`
        SELECT * FROM EmployeeTaskExecution 
        WHERE Employee_Name IN (
          SELECT First_Name + ' ' + Last_Name FROM Users WHERE ID_User = @ID_User
        )
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

    const doc = new Document({
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Disposition', 'attachment; filename="employee-report.docx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error('Ошибка экспорта Word для сотрудника:', error);
    res.status(500).json({ message: 'Ошибка при экспорте отчета' });
  }
};
