const { sql, poolConnect, pool } = require('../config/db');


exports.getTasksByProjectTypeAndPeriod = async (req, res) => {
  try {
    await poolConnect;
    const request = pool.request();
    const result = await request.query('SELECT * FROM TasksByProjectTypeAndPeriod');
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка получения TasksByProjectTypeAndPeriod:', err);
    res.status(500).send('Ошибка получения данных');
  }
};

exports.getTasksByEmployeeAndPeriod = async (req, res) => {
  try {
    await poolConnect;
    const request = pool.request();
    const result = await request.query('SELECT * FROM TasksByEmployeeAndPeriod');
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка получения TasksByEmployeeAndPeriod:', err);
    res.status(500).send('Ошибка получения данных');
  }
};

exports.getTasksByProjectAndPeriod = async (req, res) => {
  try {
    await poolConnect;
    const request = pool.request();
    const result = await request.query('SELECT * FROM TasksByProjectAndPeriod');
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка получения TasksByProjectAndPeriod:', err);
    res.status(500).send('Ошибка получения данных');
  }
};

exports.getKanbanOverview = async (req, res) => {
  try {
    await poolConnect;
    const request = pool.request();
    const result = await request.query('SELECT * FROM KanbanBoardView');
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка получения KanbanBoardView:', err);
    res.status(500).send('Ошибка получения данных');
  }
};

exports.getEmployeeTimeTracking = async (req, res) => {
  try {
    await poolConnect;
    const request = pool.request();
    const result = await request.query('SELECT * FROM EmployeeTimeTrackingReport');
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка получения EmployeeTimeTrackingReport:', err);
    res.status(500).send('Ошибка получения данных');
  }
};
