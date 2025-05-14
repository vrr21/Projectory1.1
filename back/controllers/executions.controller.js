const { pool, sql } = require('../config/db');

// Удаление всех записей Execution по ID_Task
exports.deleteExecutionsByTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const poolConn = await pool.connect();
    await poolConn.request()
      .input('taskId', sql.Int, taskId)
      .query('DELETE FROM Execution WHERE ID_Task = @taskId');

    res.status(200).json({ message: 'Execution записи удалены' });
  } catch (error) {
    console.error('Ошибка при удалении Execution:', error);
    res.status(500).json({ message: 'Ошибка при удалении Execution', error: error.message });
  }
};
