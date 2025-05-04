const { Orders } = require('../models');  // Модель для работы с проектами

// Получить все проекты
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Orders.findAll();  // Получаем все проекты
    res.json(projects);  // Отправляем проекты в формате JSON
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Получить проект по ID
exports.getProjectById = async (req, res) => {
  const { id } = req.params;
  try {
    const project = await Orders.findByPk(id);  // Поиск проекта по ID
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);  // Отправляем проект в формате JSON
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};
