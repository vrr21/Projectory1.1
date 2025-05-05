const { sql, poolConnect, pool } = require('../config/db');

// Контроллер для добавления записи учета времени
const createTimeEntry = async (req, res) => {
  const { project, taskName, description, hours, date } = req.body;

  console.log('Received data:', req.body);  // Логируем данные для проверки

  try {
    await poolConnect;

    const tokenUser = req.user;
    if (!tokenUser || !tokenUser.id) {
      return res.status(401).json({ message: 'Unauthorized: No user info in token' });
    }

    const request = pool.request();
    request.input('ID_Task', sql.Int, taskName);  // Убедитесь, что taskName это ID задачи
    request.input('ID_Employee', sql.Int, tokenUser.id);
    request.input('Start_Date', sql.DateTime, date);
    request.input('End_Date', sql.DateTime, date);

    await request.query(`
      INSERT INTO Execution (ID_Task, ID_Employee, Start_Date, End_Date)
      VALUES (@ID_Task, @ID_Employee, @Start_Date, @End_Date)
    `);

    res.status(201).json({ message: 'Запись времени успешно добавлена' });
  } catch (error) {
    console.error('Ошибка при добавлении записи времени:', error);
    res.status(500).json({ message: 'Внутренняя ошибка при добавлении записи времени' });
  }
};

// Контроллер для получения записей времени
const getTimeEntries = async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM Execution');
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при загрузке записей времени:', error);
    res.status(500).json({ message: 'Ошибка при загрузке записей времени' });
  }
};

module.exports = { createTimeEntry, getTimeEntries };
