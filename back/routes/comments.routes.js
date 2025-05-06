// back/routes/comments.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/comments.controller');

// Получение комментариев по задаче
router.get('/:taskId', controller.getCommentsByTask);

// Добавление нового комментария
router.post('/', controller.addComment);

// Обновление существующего комментария
router.put('/:id', controller.updateComment);

// Удаление комментария
router.delete('/:id', controller.deleteComment);

module.exports = router;
