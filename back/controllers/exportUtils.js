const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } = require('docx');
const { poolConnect, sql, pool } = require('../config/db');

// Получение данных проектов
async function getProjectsData() {
  await poolConnect;
  const request = pool.request();
  const result = await request.query(`
    SELECT o.Order_Name, pt.Type_Name, o.Creation_Date, o.End_Date, o.Status, t.Team_Name
    FROM Orders o
    LEFT JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
    LEFT JOIN Teams t ON o.ID_Team = t.ID_Team
  `);
  return result.recordset;
}

// Форматирование даты
function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU');
}

// ✅ Экспорт в Excel
async function exportProjectsToExcel(res) {
  const data = await getProjectsData();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Projects');

  sheet.addRow(['Название проекта', 'Тип проекта', 'Дата создания', 'Дата окончания', 'Статус', 'Команда']);
  data.forEach(row => {
    sheet.addRow([
      row.Order_Name,
      row.Type_Name,
      formatDate(row.Creation_Date),
      formatDate(row.End_Date),
      row.Status,
      row.Team_Name || '—'
    ]);
  });

  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="projects.xlsx"');
  res.setHeader('Content-Length', buffer.length);

  res.send(buffer);
}

// ✅ Экспорт в PDF через Puppeteer (HTML в PDF с поддержкой кириллицы)
async function exportProjectsToPDF(res) {
  const data = await getProjectsData();

  const htmlContent = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
      </style>
    </head>
    <body>
      <h1>Список проектов</h1>
      <table>
        <thead>
          <tr>
            <th>Название проекта</th>
            <th>Тип проекта</th>
            <th>Дата создания</th>
            <th>Дата окончания</th>
            <th>Статус</th>
            <th>Команда</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td>${row.Order_Name}</td>
              <td>${row.Type_Name}</td>
              <td>${formatDate(row.Creation_Date)}</td>
              <td>${formatDate(row.End_Date)}</td>
              <td>${row.Status}</td>
              <td>${row.Team_Name || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4' });

  await browser.close();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="projects.pdf"');
  res.setHeader('Content-Length', pdfBuffer.length);

  res.send(pdfBuffer);
}

// ✅ Экспорт в Word
async function exportProjectsToWord(res) {
  const data = await getProjectsData();

  const tableRows = [
    new TableRow({
      children: ['Название проекта', 'Тип проекта', 'Дата создания', 'Дата окончания', 'Статус', 'Команда']
        .map(header => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })]
        }))
    }),
    ...data.map(row =>
      new TableRow({
        children: [
          row.Order_Name,
          row.Type_Name,
          formatDate(row.Creation_Date),
          formatDate(row.End_Date),
          row.Status,
          row.Team_Name || '—'
        ].map(cellValue => new TableCell({
          children: [new Paragraph(cellValue || '—')]
        }))
      })
    )
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Список проектов', bold: true, size: 32 })],
        }),
        new Table({ rows: tableRows })
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', 'attachment; filename="projects.docx"');
  res.setHeader('Content-Length', buffer.length);

  res.send(buffer);
}

// ✅ Экспортный интерфейс
module.exports = {
  exportProjectsToExcel,
  exportProjectsToPDF,
  exportProjectsToWord,
};
