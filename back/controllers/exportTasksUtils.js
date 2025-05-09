const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } = require('docx');
const { poolConnect, sql, pool } = require('../config/db');

// Получение данных задач
async function getTasksData() {
  await poolConnect;
  const result = await pool.request().query(`
    SELECT t.Task_Name, t.Description, t.Time_Norm, s.Status_Name, o.Order_Name, tm.Team_Name, t.Deadline
    FROM Tasks t
    LEFT JOIN Statuses s ON t.ID_Status = s.ID_Status
    LEFT JOIN Orders o ON t.ID_Order = o.ID_Order
    LEFT JOIN Teams tm ON o.ID_Team = tm.ID_Team
  `);
  return result.recordset;
}

function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU');
}

// ✅ Экспорт в Excel
async function exportTasksToExcel(res) {
    const data = await getTasksData();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tasks');
  
    sheet.addRow(['Название задачи', 'Описание', 'Норма времени', 'Статус', 'Проект', 'Команда', 'Дедлайн']);
    data.forEach(row => {
      sheet.addRow([
        row.Task_Name,
        row.Description,
        row.Time_Norm,
        row.Status_Name,
        row.Order_Name,
        row.Team_Name || '—',
        formatDate(row.Deadline)
      ]);
    });
  
    const buffer = await workbook.xlsx.writeBuffer();
  
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks.xlsx"');
    res.setHeader('Content-Length', buffer.length);
  
    res.send(buffer);
  }
  
// ✅ Экспорт в PDF
async function exportTasksToPDF(res) {
  const data = await getTasksData();

  const htmlContent = `
    <html><head><meta charset="UTF-8"><style>
      body { font-family: Arial; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #000; padding: 8px; }
    </style></head><body>
    <h1>Список задач</h1>
    <table>
      <tr>
        <th>Название задачи</th><th>Описание</th><th>Норма времени</th>
        <th>Статус</th><th>Проект</th><th>Команда</th><th>Дедлайн</th>
      </tr>
      ${data.map(row => `
        <tr>
          <td>${row.Task_Name}</td>
          <td>${row.Description}</td>
          <td>${row.Time_Norm}</td>
          <td>${row.Status_Name}</td>
          <td>${row.Order_Name}</td>
          <td>${row.Team_Name || '—'}</td>
          <td>${formatDate(row.Deadline)}</td>
        </tr>
      `).join('')}
    </table></body></html>`;

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();

  res.setHeader('Content-Disposition', 'attachment; filename="tasks.pdf"');
  res.send(pdfBuffer);
}

// ✅ Экспорт в Word
async function exportTasksToWord(res) {
  const data = await getTasksData();

  const rows = [
    new TableRow({
      children: ['Название задачи', 'Описание', 'Норма времени', 'Статус', 'Проект', 'Команда', 'Дедлайн'].map(text =>
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] })
      )
    }),
    ...data.map(row => new TableRow({
      children: [
        row.Task_Name,
        row.Description,
        String(row.Time_Norm),
        row.Status_Name,
        row.Order_Name,
        row.Team_Name || '—',
        formatDate(row.Deadline)
      ].map(value => new TableCell({ children: [new Paragraph(value)] }))
    }))
  ];

  const doc = new Document({
    sections: [{ children: [new Paragraph({ children: [new TextRun('Список задач')] }), new Table({ rows })] }]
  });

  const buffer = await Packer.toBuffer(doc);
  res.setHeader('Content-Disposition', 'attachment; filename="tasks.docx"');
  res.send(buffer);
}

module.exports = {
  exportTasksToExcel,
  exportTasksToPDF,
  exportTasksToWord
};
