const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, VerticalAlign } = require('docx');
const { poolConnect, sql, pool } = require('../config/db');

function formatDate(date) {
  if (!date) return '–';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU');
}

async function getEmployeesData() {
  await poolConnect;
  const result = await pool.request().query(`
    SELECT 
      U.First_Name,
      U.Last_Name,
      U.Email,
      U.Phone,
      ISNULL(U.Avatar, '–') AS Avatar,
      U.Archived,

      -- Роли
      ISNULL((
        SELECT STRING_AGG(TM.Role + ' (Команда: ' + T.Team_Name + ')', ', ')
        FROM TeamMembers TM
        JOIN Teams T ON TM.ID_Team = T.ID_Team
        WHERE TM.ID_User = U.ID_User
      ), '–') AS Roles,

      -- Команды
      ISNULL((
        SELECT STRING_AGG(T.Team_Name, ', ')
        FROM TeamMembers TM
        JOIN Teams T ON TM.ID_Team = T.ID_Team
        WHERE TM.ID_User = U.ID_User
      ), '–') AS Teams,

      -- Проекты
      ISNULL((
        SELECT STRING_AGG(O.Order_Name, ', ')
        FROM Orders O
        WHERE EXISTS (
          SELECT 1
          FROM Teams T
          JOIN TeamMembers TM ON T.ID_Team = TM.ID_Team
          WHERE T.ID_Team = O.ID_Team AND TM.ID_User = U.ID_User
        )
      ), '–') AS Projects,

      -- Задачи
      ISNULL((
        SELECT STRING_AGG(TK.Task_Name, ', ')
        FROM Assignment A
        JOIN Tasks TK ON A.ID_Task = TK.ID_Task
        WHERE A.ID_Employee = U.ID_User
      ), '–') AS Tasks

    FROM Users U
  `);
  return result.recordset;
}

// ✅ Excel
async function exportEmployeesToExcel(res) {
  const data = await getEmployeesData();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Employees');

  const titleRow = sheet.addRow(['Таблица 1.2 – Список сотрудников']);
  titleRow.font = { bold: true, size: 12 };
  sheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`);

  const headerRow = sheet.addRow([
    'Имя', 'Фамилия', 'Email', 'Телефон',
    'Роли', 'Команды', 'Проекты', 'Задачи'
  ]);

  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  data.forEach((emp, idx) => {
    const row = sheet.addRow([
      emp.First_Name,
      emp.Last_Name,
      emp.Email,
      emp.Phone,
      emp.Roles,
      emp.Teams,
      emp.Projects,
      emp.Tasks
    ]);
    row.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: idx % 2 === 0 ? 'FFD3D3D3' : 'FFFFFFFF' }
      };
      cell.alignment = { vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  sheet.columns.forEach(col => {
    let max = 10;
    col.eachCell({ includeEmpty: true }, cell => {
      const val = cell.value?.toString() || '';
      max = Math.max(max, val.length + 2);
    });
    col.width = max;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="employees.xlsx"');
  res.send(buffer);
}

// ✅ PDF
async function exportEmployeesToPDF(res) {
  const data = await getEmployeesData();

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #000; padding: 6px; }
          th { background-color: #333; color: #fff; }
          tr:nth-child(even) { background-color: #D3D3D3; }
        </style>
      </head>
      <body>
        <h1>Список сотрудников</h1>
        <table>
          <thead>
            <tr>
              <th>Имя</th><th>Фамилия</th><th>Email</th><th>Телефон</th>
              <th>Роли</th><th>Команды</th><th>Проекты</th><th>Задачи</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(emp => `
              <tr>
                <td>${emp.First_Name}</td>
                <td>${emp.Last_Name}</td>
                <td>${emp.Email}</td>
                <td>${emp.Phone}</td>
                <td>${emp.Roles}</td>
                <td>${emp.Teams}</td>
                <td>${emp.Projects}</td>
                <td>${emp.Tasks}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="employees.pdf"');
  res.send(pdf);
}

// ✅ Word
async function exportEmployeesToWord(res) {
  const data = await getEmployeesData();

  const headerRow = new TableRow({
    children: ['Имя', 'Фамилия', 'Email', 'Телефон', 'Роли', 'Команды', 'Проекты', 'Задачи'].map(text =>
      new TableCell({
        shading: { fill: '333333' },
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF' })] })],
        verticalAlign: VerticalAlign.CENTER
      })
    )
  });

  const dataRows = data.map((emp, idx) =>
    new TableRow({
      children: [
        emp.First_Name, emp.Last_Name, emp.Email, emp.Phone,
        emp.Roles, emp.Teams, emp.Projects, emp.Tasks
      ].map(val => new TableCell({
        shading: { fill: idx % 2 === 0 ? 'D3D3D3' : 'FFFFFF' },
        children: [new Paragraph(val)],
        verticalAlign: VerticalAlign.CENTER
      }))
    })
  );

  const table = new Table({ rows: [headerRow, ...dataRows] });

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Список сотрудников', bold: true, size: 28 })],
          alignment: 'center',
          spacing: { after: 480 }
        }),
        table
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  res.setHeader('Content-Disposition', 'attachment; filename="employees.docx"');
  res.send(buffer);
}

module.exports = {
  exportEmployeesToExcel,
  exportEmployeesToPDF,
  exportEmployeesToWord
};
