const { exportTeamsToExcel, exportTeamsToPDF, exportTeamsToWord } = require('./exportTeamsUtils');

exports.exportTeams = async (req, res) => {
  const { format } = req.query; // GET — берём из query

  if (!format) {
    return res.status(400).send('Формат обязателен для экспорта');
  }

  try {
    switch (format) {
      case 'excel':
        return exportTeamsToExcel(res);
      case 'pdf':
        return exportTeamsToPDF(res);
      case 'word':
        return exportTeamsToWord(res);
      default:
        return res.status(400).send('Неверный формат экспорта');
    }
  } catch (error) {
    console.error('Ошибка при экспорте:', error);
    return res.status(500).send('Внутренняя ошибка сервера при экспорте');
  }
};
