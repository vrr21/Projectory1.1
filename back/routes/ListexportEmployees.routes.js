const express = require('express');
const router = express.Router();
const {
  exportEmployeesToExcel,
  exportEmployeesToPDF,
  exportEmployeesToWord
} = require('../controllers/ListexportEmployees.controller');

router.get('/', async (req, res) => {
  const format = req.query.format;
  if (format === 'excel') return exportEmployeesToExcel(res);
  if (format === 'pdf') return exportEmployeesToPDF(res);
  if (format === 'word') return exportEmployeesToWord(res);
  return res.status(400).json({ message: 'Неверный формат экспорта' });
});

module.exports = router;
