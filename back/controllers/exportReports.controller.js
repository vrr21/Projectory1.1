// controllers/exportReports.controller.js
const {
  exportReportsToWord,
  exportReportsToExcel,
  exportReportsToPdf,
} = require('./exportReportsUtils');

exports.exportReportsHandler = async (req, res) => {
  console.log('=== EXPORT REQUEST RECEIVED ===');
  console.log('Query:', req.query);
  console.log('User:', req.user);

  const format = req.query.format;

  if (!format) {
    return res.status(400).send('Формат обязателен для экспорта');
  }

  switch (format) {
    case 'word':
      return exportReportsToWord(res);
    case 'excel':
      return exportReportsToExcel(res);
    case 'pdf':
      return exportReportsToPdf(res);
    default:
      return res.status(400).send('Неверный формат отчёта');
  }
};
