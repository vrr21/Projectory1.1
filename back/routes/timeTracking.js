const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');

const {
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntries,
} = require('../controllers/timeTController');

// Получение всех записей учета времени
router.get('/time-tracking', verifyToken, getTimeEntries);

// Создание новой записи учета времени
router.post('/time-tracking', verifyToken, createTimeEntry);

// Обновление существующей записи учета времени
router.put('/time-tracking/:id', verifyToken, updateTimeEntry);

// Удаление записи учета времени
router.delete('/time-tracking/:id', verifyToken, deleteTimeEntry);

module.exports = router;
