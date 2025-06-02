const {
  exportTasksToExcel,
  exportTasksToPDF,
  exportTasksToWord,
} = require('./exportTasksUtils');

exports.exportTasksHandler = async (req, res) => {
  try {
    const format = req.params.format;  // 🛠️ Используем params вместо query

    switch (format) {
      case 'excel':
        return await exportTasksToExcel(res);
      case 'pdf':
        return await exportTasksToPDF(res);
      case 'word':
        return await exportTasksToWord(res);
      default:
        return res.status(400).send('Неверный формат экспорта');
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).send('Ошибка при экспорте данных');
  }
};
