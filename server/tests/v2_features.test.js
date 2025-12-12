
const request = require('supertest');
const { app, pool } = require('../server');

describe('V2 Features API Tests', () => {
    let token;
    let taskId;

    beforeAll(async () => {
        try {
            console.log("TEST: Cleaning up test user...");
            await pool.query('DELETE FROM users WHERE email = $1', ['testv2@example.com']);
            console.log("TEST: Registering test user...");
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test V2 User',
                    email: 'testv2@example.com',
                    password: 'password123'
                });
            console.log("TEST: Register response:", registerRes.status, registerRes.body);
            token = registerRes.body.token;
        } catch (e) {
            console.error("TEST: beforeAll failed", e);
        }
    });

    afterAll(async () => {
        try {
            if (taskId) {
                await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
            }
            await pool.query('DELETE FROM users WHERE email = $1', ['testv2@example.com']);
            await pool.end();
        } catch (e) { console.error("TEST: afterAll failed", e); }
    });

    describe('Subtasks handling', () => {
        it('should create a task with empty subtasks initially', async () => {
            console.log("TEST: Creating task...");
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'V2 Feature Task',
                    priority: 'High'
                });

            console.log("TEST: Create Task Response:", res.status, res.body);
            expect(res.statusCode).toEqual(201);
            expect(res.body.subtasks).toEqual([]);
            taskId = res.body.id;
        });

        it('should update task with generated subtasks', async () => {
            console.log("TEST: Updating task...");
            const subtasks = [
                { id: '1', title: 'Step 1', isCompleted: false },
                { id: '2', title: 'Step 2', isCompleted: true }
            ];

            const res = await request(app)
                .put(`/api/tasks/${taskId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'V2 Feature Task Updated',
                    priority: 'High',
                    subtasks: subtasks
                });

            console.log("TEST: Update Task Response:", res.status, res.body);
            expect(res.statusCode).toEqual(200);
            expect(res.body.subtasks).toHaveLength(2);
            expect(res.body.subtasks[0].title).toBe('Step 1');
            expect(res.body.subtasks[1].isCompleted).toBe(true);
        });

        it('should retrieve task with subtasks persisted', async () => {
            console.log("TEST: Retrieving tasks...");
            const res = await request(app)
                .get(`/api/tasks`)
                .set('Authorization', `Bearer ${token}`);

            const task = res.body.find(t => t.id === taskId);
            console.log("TEST: Retrieved Task:", task);
            expect(task).toBeDefined();
            expect(task.subtasks).toHaveLength(2);
            expect(task.subtasks[0].id).toBe('1');
        });
    });
});

