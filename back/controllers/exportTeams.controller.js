const {
    exportTeamsToExcel,
    exportTeamsToPDF,
    exportTeamsToWord,
  } = require('./exportTeamsUtils');
  
  
  exports.exportTeams = async (req, res) => {
    try {
      const format = req.query.format;
  
      switch (format) {
        case 'excel':
          return await exportTeamsToExcel(res);
        case 'pdf':
          return await exportTeamsToPDF(res);
        case 'docx':
          return await exportTeamsToWord(res);
        default:
          return res.status(400).send('Неверный формат экспорта');
      }
      
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).send('Ошибка при экспорте данных');
    }
  };
  