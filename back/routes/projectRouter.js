const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); // модель пользователя
const Project = require('../models/project.model'); // модель проекта

// Маршрут для получения всех проектов с фильтрацией по команде пользователя
router.get('/projects', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Декодируем JWT токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId; // Извлекаем ID пользователя из токена

    // Получаем информацию о пользователе, включая его команду
    const user = await User.findById(userId).populate('team'); // Подразумевается, что в модели User есть поле team
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Получаем проекты, связанные с командой пользователя
    const projects = await Project.find({ teamID: user.team._id }); // Предполагаем, что команда хранится в поле team._id
    return res.json(projects);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
