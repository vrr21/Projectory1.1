const {
    exportTeamsToExcel,
    exportTeamsToPDF,
    exportTeamsToWord,
  } = require('./exportTeamsUtils');
  
  
  exports.exportTeams = async (req, res) => {
    try {
      const { format, teams } = req.body;
  
      switch (format) {
        case 'excel':
          return await exportTeamsToExcel(res, teams);
        case 'pdf':
          return await exportTeamsToPDF(res, teams);
        case 'docx':
          return await exportTeamsToWord(res, teams);
        default:
          return res.status(400).send('Неверный формат экспорта');
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).send('Ошибка при экспорте данных');
    }
  };
  