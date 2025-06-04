const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');

const {
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntries,
  getAllTimeEntries
} = require('../controllers/timeTController');

// Получение всех записей учета времени для сотрудника
router.get('/time-tracking', verifyToken, getTimeEntries);

// Получение всех записей учета времени для менеджера
router.get('/time-tracking/all', verifyToken, getAllTimeEntries);

// Создание новой записи учета времени
router.post('/time-tracking', verifyToken, createTimeEntry);

// Обновление существующей записи учета времени
router.put('/time-tracking/:id', verifyToken, updateTimeEntry);

// Удаление записи учета времени
router.delete('/time-tracking/:id', verifyToken, deleteTimeEntry);

module.exports = router;
