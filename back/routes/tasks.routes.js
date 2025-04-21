const express = require('express');
const { pool, sql } = require('../config/db');
const router = express.Router();

// Получение всех задач
router.get('/', async (req, res) => {
  try {
    const tasks = await pool.request().query('SELECT * FROM Tasks');
    res.json(tasks.recordset);
  } catch (error) {
    console.error('Ошибка при получении задач:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Добавление новой задачи
router.post('/', async (req, res) => {
  const { Task_Name, Description, Time_Norm, ID_Status } = req.body;
  try {
    // Получаем ID_Status по статусу
    const statusResult = await pool.request()
      .input('Status_Name', sql.NVarChar, req.body.Status_Name)
      .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name');
    
    if (statusResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }

    const ID_Status = statusResult.recordset[0].ID_Status;

    await pool.request()
      .input('Task_Name', sql.NVarChar, Task_Name)
      .input('Description', sql.NVarChar, Description)
      .input('Time_Norm', sql.Int, Time_Norm)
      .input('ID_Status', sql.Int, ID_Status)
      .query(`
        INSERT INTO Tasks (Task_Name, Description, Time_Norm, ID_Status)
        VALUES (@Task_Name, @Description, @Time_Norm, @ID_Status)
      `);

    res.status(201).json({ message: 'Задача успешно создана' });
  } catch (error) {
    console.error('Ошибка при добавлении задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обновление задачи
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { Task_Name, Description, Time_Norm, Status_Name } = req.body;
  
  try {
    const statusResult = await pool.request()
      .input('Status_Name', sql.NVarChar, Status_Name)
      .query('SELECT ID_Status FROM Statuses WHERE Status_Name = @Status_Name');
    
    if (statusResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }

    const ID_Status = statusResult.recordset[0].ID_Status;

    await pool.request()
      .input('Task_Name', sql.NVarChar, Task_Name)
      .input('Description', sql.NVarChar, Description)
      .input('Time_Norm', sql.Int, Time_Norm)
      .input('ID_Status', sql.Int, ID_Status)
      .input('ID_Task', sql.Int, id)
      .query(`
        UPDATE Tasks
        SET Task_Name = @Task_Name,
            Description = @Description,
            Time_Norm = @Time_Norm,
            ID_Status = @ID_Status
        WHERE ID_Task = @ID_Task
      `);

    res.json({ message: 'Задача успешно обновлена' });
  } catch (error) {
    console.error('Ошибка при обновлении задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удаление задачи
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.request()
      .input('ID_Task', sql.Int, id)
      .query('DELETE FROM Tasks WHERE ID_Task = @ID_Task');

    res.json({ message: 'Задача успешно удалена' });
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
