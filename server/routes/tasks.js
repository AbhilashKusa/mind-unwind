const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id, title, description, priority, category, is_completed, 
        TO_CHAR(due_date, 'YYYY-MM-DD') as due_date, 
        subtasks, comments, created_at 
      FROM tasks 
      WHERE user_id = $1
      ORDER BY is_completed ASC, created_at DESC
    `, [req.user.id]);

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

router.post('/', authenticateToken, async (req, res) => {
    const t = req.body;
    const userId = req.user.id;
    try {
        const query = `
      INSERT INTO tasks (id, title, description, priority, category, is_completed, due_date, subtasks, comments, created_at, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::jsonb, $9::jsonb, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        priority = EXCLUDED.priority,
        category = EXCLUDED.category,
        is_completed = EXCLUDED.is_completed,
        due_date = EXCLUDED.due_date,
        subtasks = EXCLUDED.subtasks,
        comments = EXCLUDED.comments,
        user_id = EXCLUDED.user_id 
    `;

        const values = [
            t.id, t.title, t.description, t.priority, t.category, t.isCompleted,
            t.dueDate || null, JSON.stringify(t.subtasks), JSON.stringify(t.comments), t.createdAt,
            userId
        ];

        await pool.query(query, values);
        res.json({ success: true });
    } catch (err) {
        console.error("Task Save Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
