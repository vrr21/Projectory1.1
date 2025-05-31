const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, VerticalAlign, PageOrientation } = require('docx');
const { poolConnect, sql, pool } = require('../config/db');

// Функция для получения данных проектов и команд сотрудника
async function getProjectsAndTeamsData(userId) {
  await poolConnect;
  const request = pool.request();
  request.input('userId', sql.Int, userId);

  const projectsQuery = `
    SELECT o.Order_Name, pt.Type_Name, o.Creation_Date, o.End_Date, o.Status, t.Team_Name
    FROM Orders o
    LEFT JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
    LEFT JOIN Teams t ON o.ID_Team = t.ID_Team
    WHERE o.ID_Team IN (
      SELECT ID_Team FROM TeamMembers WHERE ID_User = @userId
    )
  `;

  const teamsQuery = `
    SELECT t.Team_Name, tm.Role, u.fullName, u.email
    FROM Teams t
    INNER JOIN TeamMembers tm ON t.ID_Team = tm.ID_Team
    INNER JOIN Users u ON tm.ID_User = u.ID_User
    WHERE t.ID_Team IN (
      SELECT ID_Team FROM TeamMembers WHERE ID_User = @userId
    )
  `;

  const [projectsResult, teamsResult] = await Promise.all([
    request.query(projectsQuery),
    request.query(teamsQuery)
  ]);

  return {
    projects: projectsResult.recordset,
    teams: teamsResult.recordset
  };
}

// Функция для форматирования даты
function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU');
}

// Экспорт в Excel
async function exportToExcel(res, userId) {
  const { projects, teams } = await getProjectsAndTeamsData(userId);
  const workbook = new ExcelJS.Workbook();

  // Лист проектов
  const projectsSheet = workbook.addWorksheet('Проекты');
  projectsSheet.pageSetup.orientation = 'landscape';

  projectsSheet.addRow(['Название проекта', 'Тип проекта', 'Дата создания', 'Дата окончания', 'Статус', 'Команда']);
  projects.forEach(project => {
    projectsSheet.addRow([
      project.Order_Name,
      project.Type_Name,
      formatDate(project.Creation_Date),
      formatDate(project.End_Date),
      project.Status,
      project.Team_Name || '—'
    ]);
  });

  // Автоматическая ширина колонок
  projectsSheet.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, cell => {
      const cellValue = cell.value ? cell.value.toString() : '';
      const lines = cellValue.split('\n');
      lines.forEach(line => {
        maxLength = Math.max(maxLength, line.length);
      });
    });
    column.width = maxLength + 5;
  });

  // Лист команд
  const teamsSheet = workbook.addWorksheet('Команды');
  teamsSheet.pageSetup.orientation = 'landscape';

  teamsSheet.addRow(['Название команды', 'Роль', 'ФИО', 'Email']);
  teams.forEach(team => {
    teamsSheet.addRow([
      team.Team_Name,
      team.Role,
      team.fullName,
      team.email
    ]);
  });

  // Автоматическая ширина колонок
  teamsSheet.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, cell => {
      const cellValue = cell.value ? cell.value.toString() : '';
      const lines = cellValue.split('\n');
      lines.forEach(line => {
        maxLength = Math.max(maxLength, line.length);
      });
    });
    column.width = maxLength + 5;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="projects_teams.xlsx"');
  res.send(buffer);
}

// Экспорт в PDF
async function exportToPDF(res, userId) {
  const { projects, teams } = await getProjectsAndTeamsData(userId);

  const htmlContent = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4 landscape; }
        body { font-family: 'Times New Roman', serif; padding: 20px; }
        h1 { text-align: center; margin-bottom: 40px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
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
          ${projects.map(project => `
            <tr>
              <td>${project.Order_Name}</td>
              <td>${project.Type_Name}</td>
              <td class="center">${formatDate(project.Creation_Date)}</td>
              <td class="center">${formatDate(project.End_Date)}</td>
              <td>${project.Status}</td>
              <td>${project.Team_Name || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h1>Список команд</h1>
      <table>
        <thead>
          <tr>
            <th>Название команды</th>
            <th>Роль</th>
            <th>ФИО</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          ${teams.map(team => `
            <tr>
              <td>${team.Team_Name}</td>
              <td>${team.Role}</td>
              <td>${team.fullName}</td>
              <td>${team.email}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true
  });
  await browser.close();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="projects_teams.pdf"');
  res.send(pdfBuffer);
}

// Экспорт в Word
async function exportToWord(res, userId) {
  const { projects, teams } = await getProjectsAndTeamsData(userId);

  const projectTableRows = [
    new TableRow({
      children: ['Название проекта', 'Тип проекта', 'Дата создания', 'Дата окончания', 'Статус', 'Команда'].map(text =>
        new TableCell({
          shading: { fill: '333333' },
          children: [new Paragraph({
            children: [new TextRun({ text, bold: true, color: 'FFFFFF' })]
          })],
          verticalAlign: VerticalAlign.CENTER,
        })
      )
    }),
    ...projects.map((project, index) =>
      new TableRow({
        children: [
          project.Order_Name,
          project.Type_Name,
          formatDate(project.Creation_Date),
          formatDate(project.End_Date),
          project.Status,
          project.Team_Name || '—'
        ].map(value =>
          new TableCell({
            shading: { fill: index % 2 === 0 ? 'D3D3D3' : 'FFFFFF' },
            children: [new Paragraph(value)],
            verticalAlign: VerticalAlign.CENTER,
          })
        )
      })
    )
  ];

  const teamTableRows = [
    new TableRow({
      children: ['Название команды', 'Роль', 'ФИО', 'Email'].map(text =>
        new TableCell({
          shading: { fill: '333333' },
          children: [new Paragraph({
            children: [new TextRun({ text, bold: true, color: 'FFFFFF' })]
          })],
          verticalAlign: VerticalAlign.CENTER,
        })
      )
    }),
    ...teams.map((team, index) =>
      new TableRow({
        children: [
          team.Team_Name,
          team.Role,
          team.fullName,
          team.email
        ].map(value =>
          new TableCell({
            shading: { fill: index % 2 === 0 ? 'D3D3D3' : 'FFFFFF' },
            children: [new Paragraph(value)],
            verticalAlign: VerticalAlign.CENTER,
          })
        )
      })
    )
  ];

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE
          },
          margin: {
            top: 720,
            right: 720,
            bottom: 720,
            left: 720
          }
        }
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Список проектов', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 560 }
        }),
        new Table({
          rows: projectTableRows,
          width: { size: 100, type: 'pct' }
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Список команд', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 560, after: 560 }
        }),
        new Table({
          rows: teamTableRows,
          width: { size: 100, type: 'pct' }
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', 'attachment; filename="projects_teams.docx"');
  res.send(buffer);
}

module.exports = {
  exportToExcel,
  exportToPDF,
  exportToWord
};
