const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth.routes');
require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// ✅ Allow frontend on Vite's default port
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use('/api', authRoutes);

app.get('/', (req, res) => {
  res.send('Сервер работает!');
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});
