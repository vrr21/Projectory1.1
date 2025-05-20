const fetch = require('node-fetch');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, VerticalAlign } = require('docx');

async function getTeamsData() {
  const response = await fetch('http://localhost:3002/api/teams');
  if (!response.ok) {
    throw new Error('Не удалось получить список команд');
  }
  return response.json();
}

function formatMembers(members) {
  if (!members || members.length === 0) return '—';
  return members.map(m => `${m.fullName} (${m.role}, ${m.email})`).join('; ');
}

// ✅ Экспорт в Excel

async function exportTeamsToExcel(res) {
  const teams = await getTeamsData();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Teams');

  const titleRow = sheet.addRow(['Список команд']);
  titleRow.font = { bold: true, size: 12 };
  titleRow.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.mergeCells(`A${titleRow.number}:B${titleRow.number}`);

  const headerRow = sheet.addRow(['Название команды', 'Участники']);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  teams.forEach((team, rowIndex) => {
    const dataRow = sheet.addRow([team.Team_Name, formatMembers(team.members)]);
    dataRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIndex % 2 === 0 ? 'FFD3D3D3' : 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  // Фиксированные ширины
  sheet.getColumn(1).width = 30;  // Название команды
  sheet.getColumn(2).width = 70;  // Участники

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="teams.xlsx"');
  res.send(buffer);
}

// ✅ Экспорт в PDF
async function exportTeamsToPDF(res) {
  const teams = await getTeamsData();
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
          ${teams.map((team, rowIndex) => `
            <tr>
              <td>${team.Team_Name}</td>
              <td>${formatMembers(team.members)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>`;

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="teams.pdf"');
  res.send(pdfBuffer);
}

// ✅ Экспорт в Word
async function exportTeamsToWord(res) {
  const teams = await getTeamsData();

  const headerRow = new TableRow({
    children: ['Название команды', 'Участники'].map(text =>
      new TableCell({
        shading: { fill: '333333' },
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF' })] })],
        verticalAlign: VerticalAlign.CENTER,
      })
    )
  });

  const dataRows = teams.map((team, rowIndex) => new TableRow({
    children: [team.Team_Name, formatMembers(team.members)].map(value =>
      new TableCell({
        shading: { fill: rowIndex % 2 === 0 ? 'D3D3D3' : 'FFFFFF' },
        children: [new Paragraph(value)],
        verticalAlign: VerticalAlign.CENTER,
      })
    )
  }));

  const table = new Table({ rows: [headerRow, ...dataRows] });

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Список команд', bold: true, size: 28 })],
          alignment: 'center',
          spacing: { after: 560 },
        }),
        table
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', 'attachment: filename="teams.docx"');
  res.send(buffer);
}

module.exports = {
  exportTeamsToExcel,
  exportTeamsToPDF,
  exportTeamsToWord,
};
