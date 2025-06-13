const { sql, pool, poolConnect } = require('../config/db');
const bcrypt = require('bcryptjs');

exports.createUser = async (req, res) => {
  const { First_Name, Last_Name, Email, Phone, Password } = req.body;

  if (!First_Name || !Last_Name || !Email || !Phone || !Password) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }

  try {
    await poolConnect;

    // Проверка на существование email
    const existing = await pool.request()
      .input('Email', sql.NVarChar, Email)
      .query('SELECT * FROM Users WHERE Email = @Email');

    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    // Получение ID_Role по умолчанию ("Сотрудник")
    const roleResult = await pool.request()
      .input('RoleName', sql.NVarChar, 'Сотрудник')
      .query('SELECT ID_Role FROM Roles WHERE Role_Name = @RoleName');

    const roleId = roleResult.recordset[0]?.ID_Role;
    if (!roleId) return res.status(400).json({ message: 'Роль "Сотрудник" не найдена' });

    await pool.request()
      .input('First_Name', sql.NVarChar, First_Name)
      .input('Last_Name', sql.NVarChar, Last_Name)
      .input('Email', sql.NVarChar, Email)
      .input('Phone', sql.NVarChar, Phone)
      .input('Password', sql.NVarChar, hashedPassword)
      .input('ID_Role', sql.Int, roleId)
      .query(`
        INSERT INTO Users (First_Name, Last_Name, Email, Phone, Password, ID_Role)
        VALUES (@First_Name, @Last_Name, @Email, @Phone, @Password, @ID_Role)
      `);

    res.status(201).json({ message: 'Пользователь создан' });
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.updateUser = async (req, res) => {
  const { First_Name, Last_Name, Phone, ID_Role } = req.body;
  const { id } = req.params;

  if (!id || !First_Name || !Last_Name || ID_Role === undefined) {
    return res.status(400).json({ message: "Некорректные данные для обновления" });
  }

  try {
    await poolConnect;

    await pool.request()
      .input("ID_User", sql.Int, id)
      .input("First_Name", sql.NVarChar, First_Name)
      .input("Last_Name", sql.NVarChar, Last_Name)
      .input("Phone", sql.NVarChar, Phone)
      .input("ID_Role", sql.Int, ID_Role)
      .query(`
        UPDATE Users
        SET First_Name = @First_Name,
            Last_Name = @Last_Name,
            Phone = @Phone,
            ID_Role = @ID_Role
        WHERE ID_User = @ID_User
      `);

    // Если назначен Менеджером — удалим из команд
    if (ID_Role === 1) {
      await pool.request()
        .input("ID_User", sql.Int, id)
        .query(`DELETE FROM TeamMembers WHERE ID_User = @ID_User`);
    }

    res.json({ message: "Пользователь успешно обновлён" });
  } catch (err) {
    console.error("Ошибка обновления пользователя:", err);
    res.status(500).json({ message: "Ошибка сервера при обновлении" });
  }
};


