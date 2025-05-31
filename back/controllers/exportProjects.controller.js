const {
  exportProjectsToWord,
  exportProjectsToExcel,
  exportProjectsToPDF
} = require('../controllers/exportProjectsUtils');

exports.exportReportsHandler = async (req, res) => {
  const format = req.query.format;
  const { projects, userId } = req.body;

  if (!format) {
    return res.status(400).send('Формат обязателен для экспорта');
  }

  try {
    switch (format) {
      case 'word':
        return exportProjectsToWord(res, projects);
      case 'excel':
        return exportProjectsToExcel(res, userId);
      case 'pdf':
        return exportProjectsToPDF(res, userId);
      default:
        return res.status(400).send('Неверный формат отчёта');
    }
  } catch (error) {
    console.error('Ошибка при экспорте:', error);
    return res.status(500).send('Внутренняя ошибка сервера при экспорте');
  }
};
