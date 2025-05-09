const {
    exportTasksToExcel,
    exportTasksToPDF,
    exportTasksToWord,
  } = require('./exportTasksUtils');
  
  exports.exportTasksHandler = async (req, res) => {
    try {
      const format = req.query.format;
  
      switch (format) {
        case 'excel':
          res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          return await exportTasksToExcel(res);
  
        case 'pdf':
          res.type('application/pdf');
          return await exportTasksToPDF(res);
  
        case 'word':
          res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          return await exportTasksToWord(res);
  
        default:
          return res.status(400).send('Неверный формат экспорта');
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).send('Ошибка при экспорте данных');
    }
  };
  