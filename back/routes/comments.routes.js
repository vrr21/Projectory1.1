const express = require('express');
const router = express.Router();
const controller = require('../controllers/comments.controller');
const verifyToken = require('../middleware/authMiddleware');

// 🔹 Получение комментариев по задаче
router.get('/:taskId', controller.getCommentsByTask);

// 🔹 Добавление нового комментария к задаче
router.post('/', verifyToken, controller.addComment);

// 🔹 Обновление комментария к задаче
router.put('/:id', verifyToken, controller.updateComment);

// 🔹 Удаление комментария к задаче
router.delete('/:id', verifyToken, controller.deleteComment);

// 🔹 Удаление всех комментариев по задаче
// (оставляем как есть — если у тебя такой эндпоинт есть)


// 🔹 Получение комментариев по выполнению задачи (Execution)
router.get('/execution/:executionId', controller.getExecutionComments);

// 🔹 Добавление комментария к выполнению задачи (Execution)
router.post('/execution', verifyToken, controller.addExecutionComment);

// 🔹 Обновление комментария к выполнению задачи (Execution)
router.put('/execution/:id', verifyToken, controller.updateExecutionComment);

// 🔹 Удаление комментария к выполнению задачи (Execution)
router.delete('/execution/:id', verifyToken, controller.deleteExecutionComment);

module.exports = router;
