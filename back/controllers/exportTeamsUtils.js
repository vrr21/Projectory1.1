const fetch = require('node-fetch');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } = require('docx');

async function getTeamsData() {
  const response = await fetch('http://localhost:3002/api/teams');
  if (!response.ok) {
    throw new Error('Не удалось получить список команд');
  }
  const data = await response.json();
  return data;
}

function formatMembers(members) {
  if (!members || members.length === 0) return '—';
  return members.map(m => `${m.fullName} (${m.role}, ${m.email})`).join('; ');
}

async function exportTeamsToExcel(res) {
  const teams = await getTeamsData();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Teams');

  sheet.addRow(['Название команды', 'Участники']);

  teams.forEach(team => {
    sheet.addRow([team.Team_Name, formatMembers(team.members)]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="teams.xlsx"');
  res.send(buffer);
}

async function exportTeamsToPDF(res) {
  const teams = await getTeamsData();
  const htmlContent = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 8px; }
      </style>
    </head>
    <body>
      <h1>Список команд</h1>
      <table>
        <thead>
          <tr>
            <th>Название команды</th>
            <th>Участники</th>
          </tr>
        </thead>
        <tbody>
          ${teams.map(team => `
            <tr>
              <td>${team.Team_Name}</td>
              <td>${formatMembers(team.members)}</td>
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
  res.setHeader('Content-Disposition', 'attachment; filename="teams.pdf"');
  res.send(pdfBuffer);
}

async function exportTeamsToWord(res) {
  const teams = await getTeamsData();
  const tableRows = [
    new TableRow({
      children: ['Название команды', 'Участники'].map(header => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })]
      }))
    }),
    ...teams.map(team =>
      new TableRow({
        children: [
          team.Team_Name,
          formatMembers(team.members)
        ].map(cellValue => new TableCell({
          children: [new Paragraph(cellValue)]
        }))
      })
    )
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Список команд', bold: true, size: 32 })] }),
        new Table({ rows: tableRows })
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', 'attachment; filename="teams.docx"');
  res.send(buffer);
}

module.exports = {
  exportTeamsToExcel,
  exportTeamsToPDF,
  exportTeamsToWord,
};
