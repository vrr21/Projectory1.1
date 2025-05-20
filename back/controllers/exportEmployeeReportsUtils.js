const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, VerticalAlign, AlignmentType } = require('docx');
const puppeteer = require('puppeteer');
const { poolConnect, pool } = require('../config/db');

function formatValue(value) {
  if (value instanceof Date) {
    return new Date(value).toLocaleString('ru-RU');
  }
  return value !== null && value !== undefined ? value.toString() : '';
}

const headerTranslations = {
  Task_Name: 'Задача',
  Description: 'Описание',
  Status_Name: 'Статус',
  Order_Name: 'Проект',
  Team_Name: 'Команда',
  Deadline: 'Дедлайн',
  Hours_Spent: 'Затрачено часов',
  Start_Date: 'Дата начала',
  End_Date: 'Дата завершения',
};

// Получение данных сотрудника
async function getDataFromViews(email) {
  await poolConnect;

  const kanbanQuery = `SELECT Task_Name, Description, Status_Name, Order_Name, Team_Name, Deadline FROM KanbanBoardView`;
  const timeTrackingQuery = `SELECT Task_Name, Hours_Spent, Start_Date, End_Date FROM EmployeeTimeTrackingReport`;
  

  const request = pool.request();
  request.input('Email', email);

  const kanbanResult = await request.query(kanbanQuery);
  const timeTrackingResult = await request.query(timeTrackingQuery);

  return {
    'Мои задачи': kanbanResult.recordset,
    'Мои отработанные часы': timeTrackingResult.recordset,
  };
}

// Word Export
async function exportEmployeeReportsToWord(res, email) {
  try {
    const data = await getDataFromViews(email);

    const sections = [
      new Paragraph({
        children: [new TextRun({ text: 'Мои Отчёты', bold: true, size: 28 })],
        spacing: { after: 560 },
        alignment: AlignmentType.CENTER,
      }),
    ];

    let counter = 1;
    for (const [title, rows] of Object.entries(data)) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: `Таблица ${counter} – ${title}`, bold: true, size: 28 })],
        spacing: { before: 280, after: 0 },
        alignment: AlignmentType.LEFT,
      }));

      const tableRows = [];
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        const headerRow = new TableRow({
          children: headers.map(h => new TableCell({
            shading: { fill: '333333' },
            children: [new Paragraph({ children: [new TextRun({ text: headerTranslations[h] || h, bold: true, color: 'FFFFFF', size: 24 })] })],
            verticalAlign: VerticalAlign.CENTER,
          })),
        });
        tableRows.push(headerRow);

        rows.forEach((row, index) => {
          const dataRow = new TableRow({
            children: headers.map(h => new TableCell({
              shading: { fill: index % 2 === 0 ? 'D3D3D3' : 'FFFFFF' },
              children: [new Paragraph({ children: [new TextRun({ text: formatValue(row[h]), size: 24 })] })],
              verticalAlign: VerticalAlign.CENTER,
              width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
            })),
          });
          tableRows.push(dataRow);
        });
      } else {
        tableRows.push(new TableRow({ children: [new TableCell({ children: [new Paragraph('Нет данных')], verticalAlign: VerticalAlign.CENTER })] }));
      }

      sections.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      counter++;
    }

    const doc = new Document({ sections: [{ children: sections }] });
    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="employee_reports.docx"');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка при создании Word отчёта');
  }
}

// Excel Export
async function exportEmployeeReportsToExcel(res, email) {
  try {
    const data = await getDataFromViews(email);

    const workbook = new ExcelJS.Workbook();

    for (const [title, rows] of Object.entries(data)) {
      const worksheet = workbook.addWorksheet(title);
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        worksheet.columns = headers.map(key => ({ key, width: 20 }));
        worksheet.addRow(headers.map(h => headerTranslations[h] || h));

        rows.forEach(row => {
          worksheet.addRow(headers.map(h => formatValue(row[h])));
        });
      } else {
        worksheet.addRow(['Нет данных']);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="employee_reports.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка при создании Excel отчёта');
  }
}

// PDF Export
async function exportEmployeeReportsToPdf(res, email) {
  try {
    const data = await getDataFromViews(email);

    const htmlContent = `
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1, h2 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 5px; }
          th { background-color: #333; color: #fff; }
        </style>
      </head>
      <body>
        <h1>Мои Отчёты</h1>
        ${Object.entries(data).map(([title, rows], index) => `
          <h2>Таблица ${index + 1} – ${title}</h2>
          <table>
            <thead>
              <tr>${rows.length > 0 ? Object.keys(rows[0]).map(h => `<th>${headerTranslations[h] || h}</th>`).join('') : '<th>Нет данных</th>'}</tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? rows.map(r => `<tr>${Object.values(r).map(v => `<td>${formatValue(v)}</td>`).join('')}</tr>`).join('') : ''}
            </tbody>
          </table>
        `).join('')}
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="employee_reports.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка при создании PDF отчёта');
  }
}

module.exports = {
  exportEmployeeReportsToWord,
  exportEmployeeReportsToExcel,
  exportEmployeeReportsToPdf,
};
