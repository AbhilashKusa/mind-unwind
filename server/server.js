const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();

const { pool, initDb } = require('./config/db');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
let port = process.env.PORT || 3001;

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

// Initialize Database
if (process.env.NODE_ENV !== 'test') {
  initDb();
}

// Routes
// Health Check (Public)
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'db_error' });
  }
});

// Auth Routes
app.use('/api/auth', authRoutes);

// Task Routes
app.use('/api/tasks', taskRoutes);

// Legacy User Route (Keep for now or deprecate)
// Since this is specific legacy logic, leaving it here or could make a route file
app.get('/api/user', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users LIMIT 1');
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const startServer = (p) => {
  const server = app.listen(p, () => {
    console.log(`🚀 Server running on http://localhost:${p}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${p} is in use, trying ${p + 1}...`);
      startServer(p + 1);
    } else {
      console.error("❌ Link Error:", err);
    }
  });
};

if (require.main === module) {
  startServer(port);
}

module.exports = { app, pool };
