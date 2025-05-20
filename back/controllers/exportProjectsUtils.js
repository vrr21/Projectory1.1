const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, VerticalAlign } = require('docx');
const { poolConnect, sql, pool } = require('../config/db');

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

  // Заголовок таблицы
  const titleRow = sheet.addRow(['Таблица 1.1 – Список проектов']);
  titleRow.font = { bold: true, size: 12 };
  titleRow.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.mergeCells(`A${titleRow.number}:F${titleRow.number}`);

  // Заголовки столбцов
  const headerRow = sheet.addRow(['Название проекта', 'Тип проекта', 'Дата создания', 'Дата окончания', 'Статус', 'Команда']);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  data.forEach((row, rowIndex) => {
    const dataRow = sheet.addRow([
      row.Order_Name,
      row.Type_Name,
      formatDate(row.Creation_Date),
      formatDate(row.End_Date),
      row.Status,
      row.Team_Name || '—'
    ]);
    dataRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIndex % 2 === 0 ? 'FFD3D3D3' : 'FFFFFFFF' } };
      cell.alignment = { horizontal: /^\d+$/.test(cell.value) ? 'center' : 'left', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  sheet.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, cell => {
      const cellValue = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, cellValue.length + 2);
    });
    column.width = maxLength;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="projects.xlsx"');
  res.send(buffer);
}

// ✅ Экспорт в PDF
async function exportProjectsToPDF(res) {
  const data = await getProjectsData();
  const htmlContent = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; }
        h1 { text-align: center; margin-bottom: 40px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 5px; }
        th { background-color: #333333; color: white; }
        tr:nth-child(even) { background-color: #D3D3D3; }
        .center { text-align: center; }
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
          ${data.map((row, rowIndex) => `
            <tr>
              <td>${row.Order_Name}</td>
              <td>${row.Type_Name}</td>
              <td class="center">${formatDate(row.Creation_Date)}</td>
              <td class="center">${formatDate(row.End_Date)}</td>
              <td>${row.Status}</td>
              <td>${row.Team_Name || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>`;

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="projects.pdf"');
  res.send(pdfBuffer);
}

// ✅ Экспорт в Word
async function exportProjectsToWord(res) {
  const data = await getProjectsData();

  const headerRow = new TableRow({
    children: ['Название проекта', 'Тип проекта', 'Дата создания', 'Дата окончания', 'Статус', 'Команда'].map(text =>
      new TableCell({
        shading: { fill: '333333' },
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF' })] })],
        verticalAlign: VerticalAlign.CENTER,
      })
    )
  });

  const dataRows = data.map((row, rowIndex) => new TableRow({
    children: [
      row.Order_Name,
      row.Type_Name,
      formatDate(row.Creation_Date),
      formatDate(row.End_Date),
      row.Status,
      row.Team_Name || '—'
    ].map(value => new TableCell({
      shading: { fill: rowIndex % 2 === 0 ? 'D3D3D3' : 'FFFFFF' },
      children: [new Paragraph(value)],
      verticalAlign: VerticalAlign.CENTER,
    }))
  }));

  const table = new Table({ rows: [headerRow, ...dataRows] });

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Список проектов', bold: true, size: 28 })],
          alignment: 'center',
          spacing: { after: 560 },
        }),
        table
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  res.setHeader('Content-Disposition', 'attachment; filename="projects.docx"');
  res.send(buffer);
}

module.exports = {
  exportProjectsToExcel,
  exportProjectsToPDF,
  exportProjectsToWord
};
