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

exports.getProjectById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.pool
      .request()
      .input('ID_Order', db.sql.Int, id)
      .query(`
        SELECT 
          ID_Order,
          Order_Name,
          End_Date,
          ID_Manager
        FROM Orders
        WHERE ID_Order = @ID_Order
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Ошибка при получении проекта:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении проекта' });
  }
};
