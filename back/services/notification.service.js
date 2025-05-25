const { pool, sql } = require('../config/db');

/**
 * 🔔 Создание уведомления
 * @param {Object} param0
 * @param {string} param0.userEmail - Email пользователя
 * @param {string} param0.title - Заголовок уведомления
 * @param {string} param0.description - Текст уведомления
 */
async function createNotification({ userEmail, title, description }) {
  try {
    console.log('🚨 createNotification ВЫЗВАН с:', userEmail, title, description);

    const request = pool.request();
    await request
      .input('UserEmail', sql.NVarChar, userEmail)
      .input('Title', sql.NVarChar, title)
      .input('Description', sql.NVarChar, description)
      .query(`
        INSERT INTO Notifications (UserEmail, Title, Description, Created_At)
        VALUES (@UserEmail, @Title, @Description, GETDATE())
      `);

    console.log('✅ Уведомление вставлено в Notifications');
  } catch (err) {
    console.error('❌ Ошибка при создании уведомления:', err);
  }
}

/**
 * 🔔 Уведомление при добавлении сотрудника в проект
 * @param {number} employeeId - ID сотрудника
 * @param {string} projectName - Название проекта
 */
async function notifyProjectAssignment(employeeId, projectName) {
  try {
    console.log('🔔 notifyProjectAssignment вызван для:', employeeId, projectName);

    const result = await pool.request()
      .input('ID_User', sql.Int, employeeId)
      .query('SELECT Email FROM Users WHERE ID_User = @ID_User');

    const email = result.recordset[0]?.Email;
    console.log('📧 Email найден:', email);

    if (!email) {
      console.warn(`⚠️ Email не найден для ID_User = ${employeeId}`);
      return;
    }

    await createNotification({
      userEmail: email,
      title: 'Добавление в проект',
      description: `Вы были добавлены в проект "${projectName}"`,
    });

    console.log(`✅ Уведомление о проекте "${projectName}" успешно создано для ${email}`);
  } catch (err) {
    console.error('❌ Ошибка в notifyProjectAssignment:', err);
  }
}

module.exports = {
  createNotification,
  notifyProjectAssignment,
};
