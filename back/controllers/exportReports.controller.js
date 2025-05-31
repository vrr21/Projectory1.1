const {
  exportReportsToWord,
  exportReportsToExcel,
  exportReportsToPdf
} = require('./exportReportsUtils'); // Убедись, что путь и имена экспортеров правильные

exports.exportReportsHandler = async (req, res) => {
  console.log('=== EXPORT REQUEST RECEIVED ===');
  console.log('Query:', req.query);
  console.log('User:', req.user);

  const format = req.query.format;

  if (!format) {
    return res.status(400).send('Формат обязателен для экспорта');
  }

  try {
    switch (format) {
      case 'word':
        return await exportReportsToWord(res);
      case 'excel':
        return await exportReportsToExcel(res);
      case 'pdf':
        return await exportReportsToPdf(res);
      default:
        return res.status(400).send('Неверный формат отчёта');
    }
  } catch (error) {
    console.error('Ошибка при экспорте:', error);
    return res.status(500).send('Ошибка сервера при экспорте');
  }
};
