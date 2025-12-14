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
        subtasks, comments, created_at, workspace 
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
            createdAt: parseInt(row.created_at),
            workspace: row.workspace || 'personal'
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
        let query;
        let values;

        if (t.id) {
            // Upsert with provided ID
            query = `
                INSERT INTO tasks (id, title, description, priority, category, is_completed, due_date, subtasks, comments, created_at, user_id, workspace)
                VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::jsonb, $9::jsonb, $10, $11, $12)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    priority = EXCLUDED.priority,
                    category = EXCLUDED.category,
                    is_completed = EXCLUDED.is_completed,
                    due_date = EXCLUDED.due_date,
                    subtasks = EXCLUDED.subtasks,
                    comments = EXCLUDED.comments,
                    user_id = EXCLUDED.user_id,
                    workspace = EXCLUDED.workspace
                RETURNING *
            `;
            values = [
                t.id, t.title, t.description, t.priority, t.category, t.isCompleted || false,
                t.dueDate || null, JSON.stringify(t.subtasks || []), JSON.stringify(t.comments || []), t.createdAt || Date.now(),
                userId, t.workspace || 'personal'
            ];
        } else {
            // Create new with auto-generated ID
            query = `
                INSERT INTO tasks (title, description, priority, category, is_completed, due_date, subtasks, comments, created_at, user_id, workspace)
                VALUES ($1, $2, $3, $4, $5, $6::date, $7::jsonb, $8::jsonb, $9, $10, $11)
                RETURNING *
            `;
            values = [
                t.title, t.description, t.priority, t.category, t.isCompleted || false,
                t.dueDate || null, JSON.stringify(t.subtasks || []), JSON.stringify(t.comments || []), t.createdAt || Date.now(),
                userId, t.workspace || 'personal'
            ];
        }

        const result = await pool.query(query, values);
        const row = result.rows[0];

        // Format response to match GET structure
        const task = {
            id: row.id,
            title: row.title,
            description: row.description,
            priority: row.priority,
            category: row.category,
            isCompleted: row.is_completed,
            dueDate: row.due_date,
            subtasks: row.subtasks || [],
            comments: row.comments || [],
            createdAt: parseInt(row.created_at),
            workspace: row.workspace || 'personal'
        };

        res.status(201).json(task);
    } catch (err) {
        console.error("Task Save Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const t = req.body;
    const userId = req.user.id;

    try {
        const query = `
            UPDATE tasks 
            SET 
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                priority = COALESCE($3, priority),
                category = COALESCE($4, category),
                is_completed = COALESCE($5, is_completed),
                due_date = COALESCE($6, due_date),
                subtasks = COALESCE($7::jsonb, subtasks),
                comments = COALESCE($8::jsonb, comments),
                workspace = COALESCE($9, workspace)
            WHERE id = $10 AND user_id = $11
            RETURNING *;
        `;

        const values = [
            t.title, t.description, t.priority, t.category, t.isCompleted,
            t.dueDate,
            t.subtasks ? JSON.stringify(t.subtasks) : null,
            t.comments ? JSON.stringify(t.comments) : null,
            t.workspace || null,
            id, userId
        ];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const row = result.rows[0];
        const task = {
            id: row.id,
            title: row.title,
            description: row.description,
            priority: row.priority,
            category: row.category,
            isCompleted: row.is_completed,
            dueDate: row.due_date,
            subtasks: row.subtasks || [],
            comments: row.comments || [],
            createdAt: parseInt(row.created_at),
            workspace: row.workspace || 'personal'
        };

        res.json(task);
    } catch (err) {
        console.error("Task Update Error:", err.message);
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
