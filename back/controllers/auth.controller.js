const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByEmail, createUser } = require('../models/user.model');

async function register(req, res) {
  try {
    const { firstName, lastName, phone, email, password, roleId } = req.body;

    // Проверка наличия всех необходимых полей
    if (!firstName || !lastName || !phone || !email || !password || !roleId) {
      return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
    }

    // Проверка формата email
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email должен быть в формате @gmail.com' });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser({ firstName, lastName, phone, email, password: hashedPassword, roleId });

    res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email и пароль обязательны' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { userId: user.ID_User, roleId: user.ID_Role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}

module.exports = {
  register,
  login,
};
