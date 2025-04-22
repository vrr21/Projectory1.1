const { pool, sql } = require('../config/db');
const docx = require('docx');
const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } = docx;

exports.getEmployeeReport = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.request()
      .input('ID_User', sql.Int, id)
      .query(`SELECT * FROM EmployeeTaskExecution WHERE Employee_Name IN (
        SELECT First_Name + ' ' + Last_Name FROM Users WHERE ID_User = @ID_User
      )`);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка получения отчёта:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.exportToWord = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.request()
      .input('ID_User', sql.Int, id)
      .query(`SELECT * FROM EmployeeTaskExecution WHERE Employee_Name IN (
        SELECT First_Name + ' ' + Last_Name FROM Users WHERE ID_User = @ID_User
      )`);

    const rows = result.recordset;
    const doc = new Document();

    doc.addSection({
      children: [
        new Paragraph({ text: 'Отчёт по задачам сотрудника', heading: 'Heading1' }),
        new Table({
          rows: [
            new TableRow({
              children: Object.keys(rows[0]).map(key =>
                new TableCell({ children: [new Paragraph({ text: key, bold: true })] })
              ),
            }),
            ...rows.map(row =>
              new TableRow({
                children: Object.values(row).map(val =>
                  new TableCell({ children: [new Paragraph(String(val ?? ''))] })
                ),
              })
            ),
          ],
        }),
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Disposition', 'attachment; filename="employee-report.docx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error('Ошибка экспорта в Word:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
