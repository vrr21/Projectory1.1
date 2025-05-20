const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, VerticalAlign } = require('docx');

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
async function exportTasksToExcel(res) {
  const data = await getTasksData();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Tasks');

  // Только Список задач без номера таблицы
  const tableTitleRow = sheet.addRow(['Список задач']);
  tableTitleRow.font = { bold: true, size: 12 };
  tableTitleRow.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.mergeCells(`A${tableTitleRow.number}:G${tableTitleRow.number}`);

  // Заголовки столбцов
  const headerRow = sheet.addRow([
    'Название задачи', 'Описание', 'Норма времени',
    'Статус', 'Проект', 'Команда', 'Дедлайн'
  ]);

  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  data.forEach((row, rowIndex) => {
    const dataRow = sheet.addRow([
      row.Task_Name,
      row.Description,
      row.Time_Norm,
      row.Status_Name,
      row.Order_Name,
      row.Team_Name || '—',
      formatDate(row.Deadline)
    ]);
    dataRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowIndex % 2 === 0 ? 'FFD3D3D3' : 'FFFFFFFF' }
      };
      cell.alignment = { horizontal: /^\d+$/.test(cell.value) ? 'center' : 'left', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  // Автоматическая ширина
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
  res.setHeader('Content-Disposition', 'attachment; filename="tasks.xlsx"');
  res.send(buffer);
}

async function exportTasksToPDF(res) {
  const data = await getTasksData();
  const htmlContent = `
    <html><head><meta charset="UTF-8"><style>
      body { font-family: 'Times New Roman', serif; padding: 20px; }
      h1 { text-align: center; margin-bottom: 40px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: 5px; }
      th { background-color: #333333; color: white; }
      tr:nth-child(even) { background-color: #D3D3D3; }
      .center { text-align: center; }
    </style></head><body>
    <h1>Список задач</h1>
    <table>
      <thead>
        <tr>
          <th>Название задачи</th><th>Описание</th><th>Норма времени</th>
          <th>Статус</th><th>Проект</th><th>Команда</th><th>Дедлайн</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((row, rowIndex) => `
          <tr>
            <td>${row.Task_Name}</td>
            <td>${row.Description}</td>
            <td class="center">${row.Time_Norm}</td>
            <td>${row.Status_Name}</td>
            <td>${row.Order_Name}</td>
            <td>${row.Team_Name || '—'}</td>
            <td class="center">${formatDate(row.Deadline)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table></body></html>`;

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  res.setHeader('Content-Disposition', 'attachment; filename="tasks.pdf"');
  res.send(pdfBuffer);
}

async function exportTasksToWord(res) {
  const data = await getTasksData();

  const headerRow = new TableRow({
    children: ['Название задачи', 'Описание', 'Норма времени', 'Статус', 'Проект', 'Команда', 'Дедлайн'].map(text =>
      new TableCell({
        shading: { fill: '333333' },
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF' })] })],
        verticalAlign: VerticalAlign.CENTER,
      })
    )
  });

  const dataRows = data.map((row, rowIndex) => new TableRow({
    children: [
      row.Task_Name,
      row.Description,
      String(row.Time_Norm),
      row.Status_Name,
      row.Order_Name,
      row.Team_Name || '—',
      formatDate(row.Deadline)
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
          children: [new TextRun({ text: 'Список задач', bold: true, size: 28 })],
          alignment: 'center',
          spacing: { after: 560 },
        }),
        table
      ]
    }]
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
