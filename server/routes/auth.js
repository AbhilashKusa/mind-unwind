const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash, created_at) VALUES ($1, $2, $3, $4) RETURNING id, name, email, avatar',
            [name || 'User', email, hashedPassword, Date.now()]
        );
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ user, token });
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: "Email already exists" });
        }
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: "User not found" });

        if (!user.password_hash) {
            return res.status(400).json({ error: "Invalid login method" });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(403).json({ error: "Invalid password" });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        delete user.password_hash;
        res.json({ user, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, avatar FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.sendStatus(404);
        res.json(result.rows[0]);
    } catch (err) {
        res.sendStatus(500);
    }
});

module.exports = router;
