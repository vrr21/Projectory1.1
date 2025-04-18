const db = require('../config/db');

exports.getTeams = async (req, res) => {
  try {
    const result = await db.request().query('SELECT * FROM Teams');
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении команд:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

exports.getMembers = async (req, res) => {
  try {
    const result = await db.request().query('SELECT * FROM Users WHERE Role_ID = 2'); // пример
    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении сотрудников:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

exports.createTeam = async (req, res) => {
  const { name } = req.body;
  try {
    await db
      .request()
      .input('name', db.sql.NVarChar, name)
      .query('INSERT INTO Teams (Team_Name) VALUES (@name)');
    res.status(201).json({ message: 'Команда создана' });
  } catch (error) {
    console.error('Ошибка при создании команды:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
