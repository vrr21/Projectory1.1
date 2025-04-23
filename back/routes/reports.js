const express = require('express');
const router = express.Router();
const { pool, sql } = require('../config/db');
const {
  Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun
} = require('docx');

// 🔹 Отчёт по конкретному сотруднику
router.get('/employee/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
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
  } catch (err) {
    console.error('Ошибка при получении отчета сотрудника:', err);
    res.status(500).json({ message: 'Ошибка сервера при получении отчёта' });
  }
});

// 🔹 Экспорт отчета сотрудника в Word
router.get('/export-word/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
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

    const doc = new Document({ sections: [{ children }] });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Disposition', 'attachment; filename="employee-report.docx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    console.error('Ошибка экспорта Word для сотрудника:', err);
    res.status(500).json({ message: 'Ошибка сервера при экспорте' });
  }
});

// 🔹 Общий отчёт по всем сотрудникам (для менеджера)
router.get('/all', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT * FROM EmployeeTaskExecution
    `);

    const rows = result.recordset;
    res.json(Array.isArray(rows) ? rows : []);
  } catch (error) {
    console.error('Ошибка при получении общего отчета:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении отчета' });
  }
});

// 🔹 Экспорт общего отчёта
router.get('/export-all', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT * FROM EmployeeTaskExecution
    `);
    const rows = result.recordset;

    const children = [];

    children.push(new Paragraph({
      text: "Общий отчёт по задачам сотрудников",
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
    res.setHeader('Content-Disposition', 'attachment; filename="manager-report.docx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error('Ошибка экспорта общего отчета:', error);
    res.status(500).json({ message: 'Ошибка сервера при экспорте' });
  }
});

module.exports = router;
