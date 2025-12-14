const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    ...(connectionString
        ? {
            connectionString,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
        }
        : {
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'mindUnwind',
            password: process.env.DB_PASSWORD || 'root',
            port: process.env.DB_PORT || 5432,
        }),
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

        // Create tasks table if not exists with correct schema
        await client.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                priority VARCHAR(50),
                description TEXT,
                due_date DATE,
                category VARCHAR(100),
                is_completed BOOLEAN DEFAULT FALSE,
                user_id INTEGER,
                subtasks JSONB DEFAULT '[]'::jsonb,
                comments JSONB DEFAULT '[]'::jsonb,
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

        // Task Migrations for existing tables
        try { await client.query(`ALTER TABLE tasks ADD COLUMN user_id INTEGER;`); } catch (e) { }
        try { await client.query(`ALTER TABLE tasks ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;`); } catch (e) { }
        try { await client.query(`ALTER TABLE tasks ADD COLUMN comments JSONB DEFAULT '[]'::jsonb;`); } catch (e) { }

        // Workspace feature - add workspace column (office, personal, startup)
        try { await client.query(`ALTER TABLE tasks ADD COLUMN workspace VARCHAR(50) DEFAULT 'personal';`); } catch (e) { }

        // Migrate ID column from INTEGER/SERIAL to TEXT if needed
        try {
            await client.query(`ALTER TABLE tasks ALTER COLUMN id TYPE TEXT;`);
        } catch (e) {
            // Column may already be TEXT or have conversion issues
            if (!e.message.includes('already type')) {
                console.log('ID migration note:', e.message);
            }
        }

        console.log("✅ DB Migration Checked");
        client.release();
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            console.error("❌ Database connection failed.", err.message);
        }
    }
};

module.exports = { pool, initDb };
