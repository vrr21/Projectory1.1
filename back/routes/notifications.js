const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  getEmployeeNotifications,
  getManagerNotifications,
  deleteNotificationById,
  createNotification,
  markNotificationAsRead
} = require('../controllers/notificationController');

// 🔹 Получить уведомления сотрудника
router.get('/employee/notifications', verifyToken, getEmployeeNotifications);

// 🔹 Получить уведомления менеджера
router.get('/manager/notifications', verifyToken, getManagerNotifications);

// 🔹 Удалить уведомление
router.delete('/:id', verifyToken, deleteNotificationById);

// 🔹 Создать уведомление
router.post('/', verifyToken, createNotification);

// 🔹 Отметить уведомление как прочитанное
router.put('/:id/read', verifyToken, markNotificationAsRead);

module.exports = router;
