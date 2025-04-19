const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
require('./config/db');

const authRoutes = require('./routes/auth.routes');
const uploadRoutes = require('./routes/upload.routes');
const teamRoutes = require('./routes/team.routes');
const memberRoutes = require('./routes/member.routes');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', teamRoutes);    // /api/teams, /api/team/...
app.use('/api', memberRoutes);  // /api/members

app.get('/', (_, res) => res.send('✅ Сервер работает!'));

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});
