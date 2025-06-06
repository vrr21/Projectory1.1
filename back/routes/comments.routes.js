const express = require('express');
const router = express.Router();
const controller = require('../controllers/comments.controller');
const verifyToken = require('../middleware/authMiddleware');

// Получение комментариев по задаче
router.get('/:taskId', controller.getCommentsByTask);

// Добавление нового комментария
router.post('/', verifyToken, controller.addComment);

// Обновление существующего комментария
router.put('/:id', verifyToken, controller.updateComment);

// Удаление комментария
router.delete('/:id', verifyToken, controller.deleteComment);

// Удаление всех комментариев по задаче

router.get('/execution/:executionId', controller.getExecutionComments);
router.post('/execution', verifyToken, controller.addExecutionComment);

module.exports = router;
