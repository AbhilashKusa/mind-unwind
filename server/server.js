const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
let port = process.env.PORT || 3001;

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

// UPDATED DATABASE CONFIGURATION
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mindUnwind',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT || 5432,
});

// Initialize Check
const initDb = async () => {
  try {
    const client = await pool.connect();
    console.log(`✅ Connected to Database '${process.env.DB_NAME || 'mindUnwind'}'`);
    client.release();
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error("❌ Database connection failed.", err.message);
    }
  }
};

if (process.env.NODE_ENV !== 'test') {
  initDb();
}

// --- ROUTES ---

app.get('/api/user', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users LIMIT 1');
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user', async (req, res) => {
  const { name, avatar } = req.body;
  try {
    await pool.query(
      'INSERT INTO users (name, avatar) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET avatar = $2',
      [name, avatar]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, title, description, priority, category, is_completed, 
        TO_CHAR(due_date, 'YYYY-MM-DD') as due_date, 
        subtasks, comments, created_at 
      FROM tasks 
      ORDER BY is_completed ASC, created_at DESC
    `);

    const tasks = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      category: row.category,
      isCompleted: row.is_completed,
      dueDate: row.due_date,
      subtasks: row.subtasks || [],
      comments: row.comments || [],
      createdAt: parseInt(row.created_at)
    }));
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  const t = req.body;
  try {
    const query = `CALL upsert_task($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
    const values = [
      t.id, t.title, t.description, t.priority, t.category, t.isCompleted,
      t.dueDate || '', JSON.stringify(t.subtasks), JSON.stringify(t.comments), t.createdAt
    ];

    await pool.query(query, values);
    res.json({ success: true });
  } catch (err) {
    console.error("Task Save Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
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