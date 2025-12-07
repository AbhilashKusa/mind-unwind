const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mindUnwind',
    password: process.env.DB_PASSWORD || 'root',
    port: process.env.DB_PORT || 5432,
});

const initDb = async () => {
    try {
        const client = await pool.connect();
        console.log(`✅ Connected to Database '${process.env.DB_NAME || 'mindUnwind'}'`);

        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        avatar VARCHAR(255),
        created_at BIGINT
      );
    `);

        // Migrations
        try { await client.query(`ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;`); } catch (e) { }
        try { await client.query(`ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);`); } catch (e) { }
        try { await client.query(`ALTER TABLE users ADD COLUMN created_at BIGINT;`); } catch (e) { }
        try {
            await client.query(`ALTER TABLE users ADD COLUMN id SERIAL PRIMARY KEY;`);
        } catch (e) {
            if (e.message.includes('multiple primary keys')) {
                try { await client.query(`ALTER TABLE users ADD COLUMN id SERIAL UNIQUE;`); } catch (ex) { }
            }
        }
        try { await client.query(`ALTER TABLE tasks ADD COLUMN user_id INTEGER;`); } catch (e) { }
        try { await client.query(`ALTER TABLE tasks ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;`); } catch (e) { }
        try { await client.query(`ALTER TABLE tasks ADD COLUMN comments JSONB DEFAULT '[]'::jsonb;`); } catch (e) { }

        console.log("✅ DB Migration Checked");
        client.release();
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            console.error("❌ Database connection failed.", err.message);
        }
    }
};

module.exports = { pool, initDb };
