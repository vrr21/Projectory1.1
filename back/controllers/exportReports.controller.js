const { exportReportsToExcel } = require('./exportReportsUtils');


exports.exportReportsHandler = async (req, res) => {
  const format = req.query.format;

  if (format === 'excel') {
    return exportReportsToExcel(res);
  } else {
    return res.status(400).send('Неверный формат отчёта');
  }
};
