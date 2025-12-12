const { pool, initDb } = require('../config/db');

describe('Database Schema', () => {
    beforeAll(async () => {
        // Ensure DB is initialized
        await initDb();
    });

    afterAll(async () => {
        await pool.end();
    });

    // ===================== Users Table =====================
    describe('Users Table', () => {
        test('should have required columns', async () => {
            const result = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            `);

            const columns = result.rows.map(r => r.column_name);
            expect(columns).toContain('id');
            expect(columns).toContain('email');
            expect(columns).toContain('password_hash');
            expect(columns).toContain('name');
            expect(columns).toContain('created_at');
        });

        test('email should be unique', async () => {
            const result = await pool.query(`
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name = 'users' AND constraint_type = 'UNIQUE'
            `);

            // Should have at least one unique constraint (on email)
            expect(result.rows.length).toBeGreaterThanOrEqual(1);
        });

        test('should have primary key on id', async () => {
            const result = await pool.query(`
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name = 'users' AND constraint_type = 'PRIMARY KEY'
            `);

            expect(result.rows.length).toBe(1);
        });
    });

    // ===================== Tasks Table =====================
    describe('Tasks Table', () => {
        test('should have required columns', async () => {
            const result = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'tasks'
                ORDER BY ordinal_position
            `);

            const columns = result.rows.map(r => r.column_name);
            expect(columns).toContain('id');
            expect(columns).toContain('title');
            expect(columns).toContain('priority');
            expect(columns).toContain('description');
            expect(columns).toContain('due_date');
            expect(columns).toContain('category');
            expect(columns).toContain('is_completed');
            expect(columns).toContain('user_id');
            expect(columns).toContain('subtasks');
            expect(columns).toContain('comments');
            expect(columns).toContain('created_at');
        });

        test('id should be TEXT type', async () => {
            const result = await pool.query(`
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_name = 'tasks' AND column_name = 'id'
            `);

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].data_type).toBe('text');
        });

        test('subtasks should be JSONB type', async () => {
            const result = await pool.query(`
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_name = 'tasks' AND column_name = 'subtasks'
            `);

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].udt_name).toBe('jsonb');
        });

        test('comments should be JSONB type', async () => {
            const result = await pool.query(`
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_name = 'tasks' AND column_name = 'comments'
            `);

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].udt_name).toBe('jsonb');
        });

        test('should have primary key on id', async () => {
            const result = await pool.query(`
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name = 'tasks' AND constraint_type = 'PRIMARY KEY'
            `);

            expect(result.rows.length).toBe(1);
        });

        test('is_completed should default to false', async () => {
            const result = await pool.query(`
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'tasks' AND column_name = 'is_completed'
            `);

            expect(result.rows[0].column_default).toContain('false');
        });

        test('subtasks should default to empty array', async () => {
            const result = await pool.query(`
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'tasks' AND column_name = 'subtasks'
            `);

            expect(result.rows[0].column_default).toContain('[]');
        });
    });

    // ===================== Data Integrity =====================
    describe('Data Integrity', () => {
        const testEmail = 'dbtest@example.com';
        const testTaskId = 'db-test-task-' + Date.now();

        afterAll(async () => {
            // Cleanup
            await pool.query('DELETE FROM tasks WHERE id = $1', [testTaskId]);
            await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        });

        test('should be able to insert a user', async () => {
            const result = await pool.query(
                `INSERT INTO users (name, email, password_hash, created_at) 
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                ['DB Test User', testEmail, 'hashed_pw', Date.now()]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].id).toBeDefined();
        });

        test('should reject duplicate emails', async () => {
            await expect(
                pool.query(
                    `INSERT INTO users (name, email, password_hash, created_at) 
                     VALUES ($1, $2, $3, $4)`,
                    ['Another User', testEmail, 'hashed_pw', Date.now()]
                )
            ).rejects.toThrow(/duplicate key|unique constraint/i);
        });

        test('should be able to insert a task with TEXT id', async () => {
            const result = await pool.query(
                `INSERT INTO tasks (id, title, priority, is_completed, subtasks, comments, created_at, user_id)
                 VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8) RETURNING *`,
                [testTaskId, 'DB Test Task', 'High', false, '[]', '[]', Date.now(), 1]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].id).toBe(testTaskId);
        });

        test('should store and retrieve JSONB subtasks', async () => {
            const subtasks = JSON.stringify([
                { id: '1', title: 'Step 1', isCompleted: false },
                { id: '2', title: 'Step 2', isCompleted: true }
            ]);

            await pool.query(
                `UPDATE tasks SET subtasks = $1::jsonb WHERE id = $2`,
                [subtasks, testTaskId]
            );

            const result = await pool.query(
                `SELECT subtasks FROM tasks WHERE id = $1`,
                [testTaskId]
            );

            expect(result.rows[0].subtasks).toHaveLength(2);
            expect(result.rows[0].subtasks[0].title).toBe('Step 1');
            expect(result.rows[0].subtasks[1].isCompleted).toBe(true);
        });

        test('should query JSONB with containment operator', async () => {
            const result = await pool.query(
                `SELECT * FROM tasks 
                 WHERE subtasks @> '[{"isCompleted": true}]'::jsonb 
                 AND id = $1`,
                [testTaskId]
            );

            expect(result.rows.length).toBe(1);
        });
    });
});
