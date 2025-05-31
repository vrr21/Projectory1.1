const {
    exportToExcel,
    exportToPDF,
    exportToWord
  } = require('../controllers/exportProjectsTeamsEmployee');
  
  exports.exportProjectsTeamsEmployeeHandler = async (req, res) => {
    const { format } = req.query;
    const { userId } = req.body;
  
    if (!format) {
      return res.status(400).send('Формат обязателен для экспорта');
    }
  
    if (!userId) {
      return res.status(400).send('ID сотрудника обязателен для экспорта');
    }
  
    try {
      switch (format) {
        case 'excel':
          return exportToExcel(res, userId);
        case 'pdf':
          return exportToPDF(res, userId);
        case 'word':
          return exportToWord(res, userId);
        default:
          return res.status(400).send('Неверный формат отчёта');
      }
    } catch (error) {
      console.error('Ошибка при экспорте:', error);
      return res.status(500).send('Внутренняя ошибка сервера при экспорте');
    }
  };
  