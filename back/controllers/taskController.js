const { Tasks } = require('../models');  // Модель для задач

// Получить задачи по проекту
exports.getTasksByProject = async (req, res) => {
  const { projectId } = req.query;  // Получаем ID проекта из параметров запроса
  try {
    const tasks = await Tasks.findAll({
      where: { ID_Order: projectId }  // Фильтруем задачи по ID проекта
    });
    res.json(tasks);  // Отправляем задачи на фронтенд
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};
