const { pool, sql } = require('../config/db');

// Получение комментариев по задаче
exports.getCommentsByTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const poolConn = await pool.connect();
    const result = await poolConn.request()
      .input('taskId', sql.Int, taskId)
      .query(`
        SELECT c.ID_Comment, c.CommentText, c.Created_At,
               u.First_Name + ' ' + u.Last_Name AS AuthorName,
               u.Avatar, u.ID_User
        FROM TaskComments c
        JOIN Users u ON c.ID_User = u.ID_User
        WHERE c.ID_Task = @taskId
        ORDER BY c.Created_At ASC
      `);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('getCommentsByTask error:', err);
    res.status(500).json({ error: 'Ошибка при получении комментариев' });
  }
};

// Добавление комментария
exports.addComment = async (req, res) => {
  const { taskId, commentText } = req.body;
  const userId = req.user?.id;

  if (!taskId || !commentText || !userId) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  try {
    const poolConn = await pool.connect();
    await poolConn.request()
      .input('taskId', sql.Int, taskId)
      .input('userId', sql.Int, userId)
      .input('commentText', sql.NVarChar(sql.MAX), commentText)
      .query(`
        INSERT INTO TaskComments (ID_Task, ID_User, CommentText)
        VALUES (@taskId, @userId, @commentText)
      `);

    res.status(201).json({ message: 'Комментарий добавлен' });
  } catch (err) {
    console.error('addComment error:', err);
    res.status(500).json({ error: 'Ошибка при добавлении комментария' });
  }
};

// Обновление комментария
exports.updateComment = async (req, res) => {
  const { id } = req.params;
  const { commentText } = req.body;

  if (!commentText) {
    return res.status(400).json({ error: 'Комментарий не может быть пустым' });
  }

  try {
    const poolConn = await pool.connect();
    await poolConn.request()
      .input('id', sql.Int, id)
      .input('commentText', sql.NVarChar(sql.MAX), commentText)
      .query(`
        UPDATE TaskComments
        SET CommentText = @commentText
        WHERE ID_Comment = @id
      `);

    res.sendStatus(200);
  } catch (err) {
    console.error('updateComment error:', err);
    res.status(500).json({ error: 'Ошибка при обновлении комментария' });
  }
};

// Удаление комментария
exports.deleteComment = async (req, res) => {
  const { id } = req.params;

  try {
    const poolConn = await pool.connect();
    await poolConn.request()
      .input('id', sql.Int, id)
      .query(`
        DELETE FROM TaskComments
        WHERE ID_Comment = @id
      `);

    res.sendStatus(200);
  } catch (err) {
    console.error('deleteComment error:', err);
    res.status(500).json({ error: 'Ошибка при удалении комментария' });
  }
};


// Удаление всех комментариев по задаче
exports.deleteCommentsByTask = async (req, res) => {
  const { taskId } = req.params;

  try {
    const poolConn = await pool.connect();
    await poolConn.request()
      .input('taskId', sql.Int, taskId)
      .query('DELETE FROM TaskComments WHERE ID_Task = @taskId');

    res.status(200).json({ message: 'Все комментарии к задаче удалены' });
  } catch (err) {
    console.error('Ошибка удаления комментариев по задаче:', err);
    res.status(500).json({ error: 'Ошибка при удалении комментариев по задаче' });
  }
};
