// back/routes/notifications.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');

const {
  getNotifications,
  deleteNotificationById,
} = require('../controllers/notificationController'); // ✅ Путь без ошибок

router.get('/employee/notifications', verifyToken, getNotifications);
router.delete('/employee/notifications/:id', verifyToken, deleteNotificationById);

module.exports = router;
