const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Токен авторизации отсутствует или неверен' });
  }

  const token = authHeader.split(' ')[1];

  // ✅ Добавляем защиту от пустых или невалидных токенов
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    return res.status(401).json({ message: 'Токен отсутствует или повреждён' });
  }
  

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Ошибка при проверке токена:', error.message);
    return res.status(403).json({ message: 'Недействительный или просроченный токен' });
  }
}

module.exports = authMiddleware;
