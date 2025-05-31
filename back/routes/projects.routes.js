const express = require('express');
const { poolConnect, pool, sql } = require('../config/db');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { notifyProjectAssignment } = require('../services/notification.service');

// 📥 Получить все проекты
router.get('/', async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT 
        o.ID_Order,
        o.Order_Name,
        pt.Type_Name,
        o.Creation_Date,
        o.End_Date,
        o.Status,
        o.ID_Team,
        t.Team_Name
      FROM Orders o
      LEFT JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
      LEFT JOIN Teams t ON o.ID_Team = t.ID_Team
    `);

    const projects = result.recordset.map(project => ({
      ...project,
      Deadline: project.End_Date ? new Date(project.End_Date).toISOString() : null
    }));

    res.json(projects);
  } catch (error) {
    console.error('Ошибка при получении заказов:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении заказов' });
  }
});

// 📤 Создать проект
// 📤 Создать проект
router.post('/', verifyToken, async (req, res) => {
  const { Order_Name, Type_Name, Creation_Date, End_Date, Status, ID_Team } = req.body;
  const ID_Manager = req.body.ID_Manager || req.user?.id; // 👈 Назначаем менеджера по токену

  try {
    await poolConnect;

    let projectTypeResult = await pool.request()
      .input('typeName', sql.NVarChar, Type_Name)
      .query('SELECT ID_ProjectType FROM ProjectTypes WHERE Type_Name = @typeName');

    let ID_ProjectType;
    if (projectTypeResult.recordset.length > 0) {
      ID_ProjectType = projectTypeResult.recordset[0].ID_ProjectType;
    } else {
      const insertResult = await pool.request()
        .input('typeName', sql.NVarChar, Type_Name)
        .query('INSERT INTO ProjectTypes (Type_Name) OUTPUT INSERTED.ID_ProjectType VALUES (@typeName)');
      ID_ProjectType = insertResult.recordset[0].ID_ProjectType;
    }

    await pool.request()
      .input('Order_Name', sql.NVarChar, Order_Name)
      .input('ID_ProjectType', sql.Int, ID_ProjectType)
      .input('Creation_Date', sql.Date, Creation_Date)
      .input('End_Date', sql.Date, End_Date || null)
      .input('Status', sql.NVarChar, Status)
      .input('ID_Team', sql.Int, ID_Team)
      .input('ID_Manager', sql.Int, ID_Manager)
      .query(`
        INSERT INTO Orders (Order_Name, ID_ProjectType, Creation_Date, End_Date, Status, ID_Team, ID_Manager)
        VALUES (@Order_Name, @ID_ProjectType, @Creation_Date, @End_Date, @Status, @ID_Team, @ID_Manager)
      `);

    res.status(201).json({ message: 'Проект успешно создан' });
  } catch (error) {
    console.error('Ошибка при создании проекта:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании проекта' });
  }
});


// ✏️ Обновить проект
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { Order_Name, Type_Name, Creation_Date, End_Date, Status, ID_Team } = req.body;

  if (!Order_Name || !Type_Name || !Creation_Date || !Status || !ID_Team) {
    return res.status(400).json({ message: 'Не все обязательные поля заполнены' });
  }

  try {
    await poolConnect;

    let projectTypeResult = await pool.request()
      .input('typeName', sql.NVarChar, Type_Name)
      .query('SELECT ID_ProjectType FROM ProjectTypes WHERE Type_Name = @typeName');

    let ID_ProjectType = projectTypeResult.recordset.length > 0
      ? projectTypeResult.recordset[0].ID_ProjectType
      : (await pool.request()
          .input('typeName', sql.NVarChar, Type_Name)
          .query('INSERT INTO ProjectTypes (Type_Name) OUTPUT INSERTED.ID_ProjectType VALUES (@typeName)')
        ).recordset[0].ID_ProjectType;

    await pool.request()
      .input('ID_Order', sql.Int, id)
      .input('Order_Name', sql.NVarChar, Order_Name)
      .input('ID_ProjectType', sql.Int, ID_ProjectType)
      .input('Creation_Date', sql.Date, Creation_Date)
      .input('End_Date', sql.Date, End_Date || null)
      .input('Status', sql.NVarChar, Status)
      .input('ID_Team', sql.Int, ID_Team)
      .query(`
        UPDATE Orders
        SET Order_Name = @Order_Name,
            ID_ProjectType = @ID_ProjectType,
            Creation_Date = @Creation_Date,
            End_Date = @End_Date,
            Status = @Status,
            ID_Team = @ID_Team
        WHERE ID_Order = @ID_Order
      `);

    res.json({ message: 'Проект обновлён' });
  } catch (error) {
    console.error('Ошибка при обновлении проекта:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении проекта' });
  }
});

// ❌ Удалить проект
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await poolConnect;
    await pool.request()
      .input('ID_Order', sql.Int, id)
      .query('DELETE FROM Orders WHERE ID_Order = @ID_Order');
    res.json({ message: 'Проект удалён' });
  } catch (error) {
    console.error('Ошибка при удалении проекта:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении проекта' });
  }
});

// 🔥 Поиск проектов
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    await poolConnect;
    const result = await pool.request()
      .input('query', sql.NVarChar, `%${q}%`)
      .query(`
        SELECT ID_Order, Order_Name 
        FROM Orders 
        WHERE Order_Name LIKE @query
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка поиска проектов:', error);
    res.status(500).json({ message: 'Ошибка поиска проектов' });
  }
});

// ✅ Закрыть проект
router.patch('/:id/close', async (req, res) => {
  const { id } = req.params;
  try {
    await poolConnect;
    await pool.request()
      .input('ID_Order', sql.Int, id)
      .query("UPDATE Orders SET Status = 'Завершён' WHERE ID_Order = @ID_Order");
    res.status(200).json({ message: 'Проект закрыт' });
  } catch (error) {
    console.error('Ошибка при закрытии проекта:', error);
    res.status(500).json({ message: 'Ошибка сервера при закрытии проекта' });
  }
});

// ✅ Восстановить проект
router.patch('/:id/restore', async (req, res) => {
  const { id } = req.params;
  try {
    await poolConnect;
    await pool.request()
      .input('ID_Order', sql.Int, id)
      .query("UPDATE Orders SET Status = 'В процессе' WHERE ID_Order = @ID_Order");
    res.status(200).json({ message: 'Проект восстановлен' });
  } catch (error) {
    console.error('Ошибка при восстановлении проекта:', error);
    res.status(500).json({ message: 'Ошибка сервера при восстановлении проекта' });
  }
});

// 👥 Назначить сотрудников в проект и уведомить
router.post('/assign', verifyToken, async (req, res) => {
  const { ID_Order, employeeIds = [] } = req.body;

  if (!ID_Order || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return res.status(400).json({ message: 'ID проекта и ID сотрудников обязательны' });
  }

  try {
    await poolConnect;

    const projectResult = await pool.request()
      .input('ID_Order', sql.Int, ID_Order)
      .query('SELECT Order_Name FROM Orders WHERE ID_Order = @ID_Order');

    if (!projectResult.recordset.length) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    const projectName = projectResult.recordset[0].Order_Name;

    for (const empId of employeeIds) {
      // проверка, не добавлен ли уже
      const check = await pool.request()
        .input('ID_Order', sql.Int, ID_Order)
        .input('ID_Employee', sql.Int, empId)
        .query(`
          SELECT 1 FROM ProjectAssignments 
          WHERE ID_Order = @ID_Order AND ID_Employee = @ID_Employee
        `);

      if (!check.recordset.length) {
        await pool.request()
          .input('ID_Order', sql.Int, ID_Order)
          .input('ID_Employee', sql.Int, empId)
          .query(`
            INSERT INTO ProjectAssignments (ID_Order, ID_Employee)
            VALUES (@ID_Order, @ID_Employee)
          `);

        await notifyProjectAssignment(empId, projectName);
      } else {
        console.log(`⚠️ Сотрудник ${empId} уже назначен — уведомление не отправлено повторно.`);
      }
    }

    res.status(200).json({ message: 'Сотрудники добавлены в проект и уведомлены (если ранее не были)' });
  } catch (error) {
    console.error('❌ Ошибка при назначении сотрудников на проект:', error);
    res.status(500).json({ message: 'Ошибка сервера при назначении сотрудников' });
  }
});
// projects.routes.js
router.get('/by-team', async (req, res) => {
  const projectController = require('../controllers/project.controller');
  return projectController.getProjectsByTeam(req, res);
});

module.exports = router;
