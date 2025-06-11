const { pool, sql } = require('../config/db');
const { createNotification } = require('../services/notification.service');

exports.getCommentsByTask = async (req, res) => {
  const { taskId } = req.params;
  const { entityType = 'task' } = req.query; // <- по умолчанию 'task'

  try {
    const poolConn = await pool.connect();
    const result = await poolConn.request()
      .input('taskId', sql.Int, taskId)
      .input('entityType', sql.NVarChar(50), entityType)
      .query(`
SELECT 
  c.ID_Comment,
  c.ID_User,                                -- <--- добавляем поле!
  REPLACE(REPLACE(REPLACE(c.CommentText, CHAR(13) + CHAR(10), ' '), CHAR(13), ' '), CHAR(10), ' ') AS CommentText,
  c.Created_At,
  u.First_Name + ' ' + u.Last_Name AS AuthorName,
  u.Avatar
FROM TaskComments c
JOIN Users u ON c.ID_User = u.ID_User
WHERE c.ID_Task = @taskId AND c.EntityType = @entityType
ORDER BY c.Created_At ASC

      `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('getCommentsByTask error:', err);
    res.status(500).json({ error: 'Ошибка при получении комментариев' });
  }
};

exports.addComment = async (req, res) => {
  const { taskId, commentText, entityType = 'task' } = req.body;
  const userId = req.user?.id;

  if (!taskId || !commentText || !userId) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  try {
    const cleanedCommentText = commentText.replace(/(\r\n|\n|\r)/g, ' ').trim();
    const poolConn = await pool.connect();

    // 📝 Добавляем комментарий
    await poolConn.request()
      .input('taskId', sql.Int, taskId)
      .input('userId', sql.Int, userId)
      .input('commentText', sql.NVarChar(sql.MAX), cleanedCommentText)
      .input('entityType', sql.NVarChar(50), entityType)
      .query(`
        INSERT INTO TaskComments (ID_Task, ID_User, CommentText, EntityType)
        VALUES (@taskId, @userId, @commentText, @entityType)
      `);

    // 🔥 Получаем инфо о задаче
    let taskInfo;
    if (entityType === 'task') {
      const result = await poolConn.request()
        .input('taskId', sql.Int, taskId)
        .query(`
          SELECT 
            o.ID_Team,
            t.Task_Name,
            u.Email AS EmployeeEmail
          FROM Tasks t
          JOIN Orders o ON t.ID_Order = o.ID_Order
          JOIN Execution e ON t.ID_Task = e.ID_Task
          JOIN Users u ON e.ID_Employee = u.ID_User
          WHERE t.ID_Task = @taskId
        `);
      taskInfo = result.recordset[0];
    }

    if (taskInfo) {
      const { Task_Name, EmployeeEmail } = taskInfo;

      // 🔸 Получаем всех менеджеров (НЕ привязываем к команде)
      const managersRes = await poolConn.request()
        .query(`
          SELECT u.Email
          FROM Users u
          JOIN Roles r ON u.ID_Role = r.ID_Role
          WHERE r.Role_Name LIKE N'%менеджер%'
        `);

      const managerEmails = managersRes.recordset.map(r => r.Email);

      // 🔸 Проверяем роль комментатора
      const userRoleRes = await poolConn.request()
        .input('UserId', sql.Int, userId)
        .query(`
          SELECT r.Role_Name 
          FROM Users u
          JOIN Roles r ON u.ID_Role = r.ID_Role
          WHERE u.ID_User = @UserId
        `);

      const userRole = userRoleRes.recordset[0]?.Role_Name?.toLowerCase();

      // 🔗 Формируем ссылку на задачу
      const taskLink = `/tasks/${taskId}#comments`;

      // 🔔 Отправляем уведомления
      if (userRole && userRole.includes('менеджер') && EmployeeEmail) {
        await createNotification({
          userEmail: EmployeeEmail,
          title: `Новый комментарий к задаче: ${Task_Name}`,
          description: cleanedCommentText,
          link: taskLink
        });
      }

      for (const managerEmail of managerEmails) {
        if (managerEmail) {
          await createNotification({
            userEmail: managerEmail,
            title: `Новый комментарий к задаче: ${Task_Name}`,
            description: cleanedCommentText,
            link: taskLink
          });
        }
      }
    }

    res.status(201).json({ message: 'Комментарий добавлен' });
  } catch (err) {
    console.error('addComment error:', err);
    res.status(500).json({ error: 'Ошибка при добавлении комментария' });
  }
};

exports.updateComment = async (req, res) => {
  const { id } = req.params;
  const { commentText } = req.body;
  const userId = req.user?.id;
  const userRole = req.user?.role?.toLowerCase();

  if (!commentText || !userId) {
    return res.status(400).json({ error: 'Комментарий не может быть пустым' });
  }

  try {
    const cleanedCommentText = commentText.replace(/(\r\n|\n|\r)/g, ' ').trim();
    const poolConn = await pool.connect();
    let result;

    if (userRole && userRole.includes('менеджер')) {
      result = await poolConn.request()
        .input('id', sql.Int, id)
        .input('commentText', sql.NVarChar(sql.MAX), cleanedCommentText)
        .query(`
          UPDATE TaskComments
          SET CommentText = @commentText
          WHERE ID_Comment = @id
        `);
    } else {
      result = await poolConn.request()
        .input('id', sql.Int, id)
        .input('userId', sql.Int, userId)
        .input('commentText', sql.NVarChar(sql.MAX), cleanedCommentText)
        .query(`
          UPDATE TaskComments
          SET CommentText = @commentText
          WHERE ID_Comment = @id AND ID_User = @userId
        `);
    }

    if (result.rowsAffected[0] === 0) {
      return res.status(403).json({ error: 'Нет прав на редактирование комментария' });
    }

    res.status(200).json({ message: 'Комментарий обновлен' });
  } catch (err) {
    console.error('updateComment error:', err);
    res.status(500).json({ error: 'Ошибка при обновлении комментария' });
  }
};


exports.deleteComment = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role?.toLowerCase();

  if (!userId) {
    return res.status(401).json({ error: 'Неавторизован' });
  }

  try {
    const poolConn = await pool.connect();
    let result;

    if (userRole && userRole.includes('менеджер')) {
      result = await poolConn.request()
        .input('id', sql.Int, id)
        .query(`
          DELETE FROM TaskComments
          WHERE ID_Comment = @id
        `);
    } else {
      result = await poolConn.request()
        .input('id', sql.Int, id)
        .input('userId', sql.Int, userId)
        .query(`
          DELETE FROM TaskComments
          WHERE ID_Comment = @id AND ID_User = @userId
        `);
    }

    if (result.rowsAffected[0] === 0) {
      return res.status(403).json({ error: 'Нет прав на удаление комментария' });
    }

    res.status(200).json({ message: 'Комментарий удален' });
  } catch (err) {
    console.error('deleteComment error:', err);
    res.status(500).json({ error: 'Ошибка при удалении комментария' });
  }
};


exports.getExecutionComments = async (req, res) => {
  const { executionId } = req.params;
  try {
    const poolConn = await pool.connect();
    const result = await poolConn.request()
      .input('executionId', sql.Int, executionId)
      .query(`
        SELECT 
          ec.ID_Comment,
          ec.ID_User,  -- 🔥 Добавляем ID_User!
          ec.CommentText,
          ec.Created_At,
          u.First_Name + ' ' + u.Last_Name AS AuthorName,
          u.Avatar
        FROM ExecutionComments ec
        JOIN Users u ON ec.ID_User = u.ID_User
        WHERE ec.ID_Execution = @executionId
        ORDER BY ec.Created_At ASC
      `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('getExecutionComments error:', err);
    res.status(500).json({ error: 'Ошибка при получении комментариев' });
  }
};



exports.addExecutionComment = async (req, res) => {
  const { executionId, commentText } = req.body;
  const userId = req.user?.id;

  if (!executionId || !commentText || !userId) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  try {
    const cleanedCommentText = commentText.replace(/(\r\n|\n|\r)/g, ' ').trim();

    const poolConn = await pool.connect();
    await poolConn.request()
      .input('executionId', sql.Int, executionId)
      .input('userId', sql.Int, userId)
      .input('commentText', sql.NVarChar(sql.MAX), cleanedCommentText)
      .query(`
        INSERT INTO ExecutionComments (ID_Execution, ID_User, CommentText)
        VALUES (@executionId, @userId, @commentText)
      `);

    // 🐞 Добавим лог
    console.log("Комментарий успешно добавлен:", { executionId, userId, commentText });

    res.status(201).json({ message: 'Комментарий добавлен' });
  } catch (err) {
    console.error('addExecutionComment error:', err);
    res.status(500).json({ error: 'Ошибка при добавлении комментария' });
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


exports.updateExecutionComment = async (req, res) => {
  const { id } = req.params;
  const { commentText } = req.body;
  const userId = req.user?.id;

  if (!commentText || !userId) {
    return res.status(400).json({ error: 'Комментарий не может быть пустым' });
  }

  try {
    const cleanedCommentText = commentText.replace(/(\r\n|\n|\r)/g, ' ').trim();
    const poolConn = await pool.connect();

    const result = await poolConn.request()
      .input('id', sql.Int, id)
      .input('userId', sql.Int, userId)
      .input('commentText', sql.NVarChar(sql.MAX), cleanedCommentText)
      .query(`
        UPDATE ExecutionComments
        SET CommentText = @commentText
        WHERE ID_Comment = @id AND ID_User = @userId
      `);

    res.status(200).json({ message: 'Комментарий обновлен' });
  } catch (err) {
    console.error('updateExecutionComment error:', err);
    res.status(500).json({ error: 'Ошибка при обновлении комментария' });
  }
};

exports.deleteExecutionComment = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Неавторизован' });
  }

  try {
    const poolConn = await pool.connect();

    const result = await poolConn.request()
      .input('id', sql.Int, id)
      .input('userId', sql.Int, userId)
      .query(`
        DELETE FROM ExecutionComments
        WHERE ID_Comment = @id AND ID_User = @userId
      `);

    res.status(200).json({ message: 'Комментарий удален' });
  } catch (err) {
    console.error('deleteExecutionComment error:', err);
    res.status(500).json({ error: 'Ошибка при удалении комментария' });
  }
};
