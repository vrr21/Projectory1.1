// back/routes/notifications.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  getNotifications,
  deleteNotificationById,
  createNotification, // 👈 Добавили
} = require('../controllers/notificationController');

// Получить уведомления
router.get('/employee/notifications', verifyToken, getNotifications);

// Удалить уведомление
router.delete('/employee/notifications/:id', verifyToken, deleteNotificationById);

// Создать уведомление
router.post('/employee/notifications', verifyToken, createNotification); // 👈 Добавили

module.exports = router;
