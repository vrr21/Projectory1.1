
// back/controllers/project.controller.js
const db = require('../config/db');

// Получение всех проектов
exports.getAllProjects = async (req, res) => {
  try {
    const result = await db.pool
      .request()
      .query(`
        SELECT 
          o.ID_Order, 
          o.Order_Name, 
          pt.Type_Name, 
          o.Creation_Date, 
          o.End_Date
        FROM Orders o
        JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка при получении проектов:', err);
    res.status(500).json({ error: 'Ошибка при получении проектов' });
  }
};

// Создание проекта
exports.createProject = async (req, res) => {
  const { Order_Name, Type_Name, Creation_Date, End_Date } = req.body;

  try {
    const typeResult = await db.pool
      .request()
      .input('Type_Name', db.sql.NVarChar, Type_Name)
      .query('SELECT ID_ProjectType FROM ProjectTypes WHERE Type_Name = @Type_Name');

    if (typeResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Тип проекта не найден' });
    }

    const typeId = typeResult.recordset[0].ID_ProjectType;

    await db.pool
      .request()
      .input('Order_Name', db.sql.NVarChar, Order_Name)
      .input('ID_ProjectType', db.sql.Int, typeId)
      .input('Creation_Date', db.sql.Date, Creation_Date)
      .input('End_Date', db.sql.Date, End_Date)
      .input('Status', db.sql.NVarChar, 'Новая')
      .input('ID_Manager', db.sql.Int, 1) // заменить ID_Manager на текущего менеджера
      .query(`
        INSERT INTO Orders (Order_Name, ID_ProjectType, Creation_Date, End_Date, Status, ID_Manager)
        VALUES (@Order_Name, @ID_ProjectType, @Creation_Date, @End_Date, @Status, @ID_Manager)
      `);

    res.status(201).json({ message: 'Проект успешно создан' });
  } catch (err) {
    console.error('Ошибка при создании проекта:', err);
    res.status(500).json({ error: 'Ошибка при создании проекта' });
  }
};
exports.closeProject = async (req, res) => {
  try {
    const { id } = req.params;
    await poolConnect;
    await pool.request()
      .input('ID_Order', sql.Int, id)
      .query("UPDATE Orders SET Status = 'Завершён' WHERE ID_Order = @ID_Order");
    res.status(200).json({ message: 'Проект закрыт' });
  } catch (error) {
    console.error('Ошибка при закрытии проекта:', error);
    res.status(500).json({ message: 'Ошибка при закрытии проекта' });
  }
};

// Обновление проекта
exports.updateProject = async (req, res) => {
  const projectId = req.params.id;
  const { Order_Name, Type_Name, Creation_Date, End_Date } = req.body;

  try {
    const typeResult = await db.pool
      .request()
      .input('Type_Name', db.sql.NVarChar, Type_Name)
      .query('SELECT ID_ProjectType FROM ProjectTypes WHERE Type_Name = @Type_Name');

    if (typeResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Тип проекта не найден' });
    }

    const typeId = typeResult.recordset[0].ID_ProjectType;

    await db.pool
      .request()
      .input('ID_Order', db.sql.Int, projectId)
      .input('Order_Name', db.sql.NVarChar, Order_Name)
      .input('ID_ProjectType', db.sql.Int, typeId)
      .input('Creation_Date', db.sql.Date, Creation_Date)
      .input('End_Date', db.sql.Date, End_Date)
      .query(`
        UPDATE Orders
        SET Order_Name = @Order_Name,
            ID_ProjectType = @ID_ProjectType,
            Creation_Date = @Creation_Date,
            End_Date = @End_Date
        WHERE ID_Order = @ID_Order
      `);

    res.json({ message: 'Проект обновлён' });
  } catch (err) {
    console.error('Ошибка при обновлении проекта:', err);
    res.status(500).json({ error: 'Ошибка при обновлении проекта' });
  }
};

// Удаление проекта
exports.deleteProject = async (req, res) => {
  const projectId = req.params.id;

  try {
    await db.pool
      .request()
      .input('ID_Order', db.sql.Int, projectId)
      .query('DELETE FROM Orders WHERE ID_Order = @ID_Order');

    res.json({ message: 'Проект удалён' });
  } catch (err) {
    console.error('Ошибка при удалении проекта:', err);
    res.status(500).json({ error: 'Ошибка при удалении проекта' });
  }
};
