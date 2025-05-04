const sql = require('mssql');
require('dotenv').config();

// Чтение данных из переменных окружения
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),  // Парсинг порта как целое число
  database: process.env.DB_NAME,
  options: {
    encrypt: false,  // Отключение шифрования для локальных соединений (для безопасности используйте true, если используете SSL)
    trustServerCertificate: true, // Для работы с self-signed сертификатами
  },
  requestTimeout: 60000, // Увеличен с 15000 до 60000 мс
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
