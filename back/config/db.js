const sql = require('mssql');
require('dotenv').config();

// Чтение данных из переменных окружения
const config = {
  user: process.env.DB_USER,  // Пользователь базы данных
  password: process.env.DB_PASSWORD,  // Пароль базы данных
  server: process.env.DB_HOST,  // Хост базы данных
  port: parseInt(process.env.DB_PORT, 10),  // Парсинг порта как целое число
  database: process.env.DB_NAME,  // Имя базы данных
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',  // Использование шифрования для соединений
    trustServerCertificate: true,  // Для работы с самоподписанными сертификатами (если используется SSL)
  },
  requestTimeout: 60000,  // Увеличен с 15000 до 60000 мс
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Создание пула подключений
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

// Обработчик ошибок подключения
pool.on('error', (err) => {
  console.error('❌ Ошибка подключения к MSSQL:', err);
});

// Экспортируем пул и sql для использования в других частях приложения
module.exports = {
  sql,
  pool,
  poolConnect,
};
