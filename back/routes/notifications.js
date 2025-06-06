const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  getNotifications,
  getManagerNotifications,
  deleteNotificationById,
  createNotification,
  markNotificationAsRead 
} = require('../controllers/notificationController');

// 🔹 Получить уведомления сотрудника
router.get('/employee/notifications', verifyToken, getNotifications);

// 🔹 Получить уведомления менеджера
router.get('/manager/notifications', verifyToken, getManagerNotifications);

// 🔹 Удалить уведомление
router.delete('/employee/notifications/:id', verifyToken, deleteNotificationById);

// 🔹 Создать уведомление
router.post('/employee/notifications', verifyToken, createNotification);

// 🔹 Отметить уведомление как прочитанное
router.put('/employee/notifications/:id/read', verifyToken, markNotificationAsRead);

module.exports = router;
