// controllers/exportEmployeeReports.controller.js
const {
    exportEmployeeReportsToWord,
    exportEmployeeReportsToExcel,
    exportEmployeeReportsToPdf,
  } = require('./exportEmployeeReportsUtils');
  
  exports.exportEmployeeReportsHandler = async (req, res) => {
    const format = req.query.format;
    const email = req.query.email;
  
    if (!email) {
      return res.status(400).send('Email сотрудника обязателен');
    }
  
    switch (format) {
      case 'word':
        return exportEmployeeReportsToWord(res, email);
      case 'excel':
        return exportEmployeeReportsToExcel(res, email);
      case 'pdf':
        return exportEmployeeReportsToPdf(res, email);
      default:
        return res.status(400).send('Неверный формат отчёта');
    }
  };
  