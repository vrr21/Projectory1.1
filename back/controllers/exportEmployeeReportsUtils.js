const ExcelJS = require('exceljs');
const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  VerticalAlign,
  AlignmentType,
  PageOrientation
} = require('docx');
const puppeteer = require('puppeteer');
const { poolConnect, pool, sql } = require('../config/db');

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

  const kanbanQuery = `
    SELECT Task_Name, Description, Status_Name, Order_Name, Team_Name, Deadline 
    FROM KanbanBoardView 
    WHERE UserEmail = @Email
  `;
  const timeTrackingQuery = `
    SELECT Task_Name, Hours_Spent, Start_Date, End_Date 
    FROM EmployeeTimeTrackingReport 
    WHERE UserEmail = @Email
  `;

  const request = pool.request();
  request.input('Email', sql.NVarChar, email);

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
        children: [new TextRun({ text: 'Мои Отчёты', bold: true, size: 28 })],  // ✅ Заголовок без email
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
            children: [new Paragraph({
              children: [new TextRun({ text: headerTranslations[h] || h, bold: true, color: 'FFFFFF', size: 24 })],
              alignment: AlignmentType.CENTER,
            })],
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
        tableRows.push(new TableRow({
          children: [new TableCell({
            children: [new Paragraph('Нет данных')],
            verticalAlign: VerticalAlign.CENTER,
          })],
        }));
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
      worksheet.pageSetup.orientation = 'landscape';

      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        worksheet.columns = headers.map(key => ({ key, width: 20 }));

        // Заголовок таблицы
        const titleRow = worksheet.addRow([`Таблица – ${title}`]);
        titleRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        });
        worksheet.mergeCells(`A${titleRow.number}:${String.fromCharCode(65 + headers.length - 1)}${titleRow.number}`);

        // Заголовки колонок
        const headerRow = worksheet.addRow(headers.map(h => headerTranslations[h] || h));
        headerRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // Данные
        rows.forEach((row, rowIndex) => {
          const rowData = headers.map(h => formatValue(row[h]));
          const dataRow = worksheet.addRow(rowData);
          dataRow.height = 30; // Можно регулировать по необходимости
          dataRow.eachCell(cell => {
            cell.alignment = { horizontal: /^\d+$/.test(cell.value) ? 'center' : 'left', vertical: 'middle', wrapText: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIndex % 2 === 0 ? 'FFD3D3D3' : 'FFFFFFFF' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          });
        });

        // Автоширина колонок
        worksheet.columns.forEach(column => {
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
          @page { size: A4 landscape; }
          body { font-family: 'Times New Roman', serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 40px; }
          h2 { margin-top: 40px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 5px; }
          th { background-color: #333333; color: white; }
          tr:nth-child(even) { background-color: #D3D3D3; }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <h1>Мои Отчёты</h1>  <!-- ✅ Заголовок без email -->
        ${Object.entries(data).map(([title, rows], index) => `
          <h2>Таблица ${index + 1} – ${title}</h2>
          ${rows.length > 0 ? `
            <table>
              <thead>
                <tr>${Object.keys(rows[0]).map(h => `<th>${headerTranslations[h] || h}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${rows.map((row, rowIndex) => `
                  <tr>${Object.keys(row).map(h => {
                    const value = formatValue(row[h]);
                    const cellClass = /^\d+$/.test(value) ? 'center' : '';
                    return `<td class="${cellClass}">${value}</td>`;
                  }).join('')}</tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p>Нет данных</p>'}
        `).join('')}
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
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
