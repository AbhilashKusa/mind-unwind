const request = require('supertest');
const { app, pool } = require('../server');
const bcrypt = require('bcrypt');

describe('Persistence & Auth Lifecycle', () => {
    let server;
    let userToken;
    let userId;
    const testEmail = `persist_${Date.now()}@test.com`;
    const testPass = 'password123';

    beforeAll((done) => {
        // Find an open port for test server to avoid collisions
        server = app.listen(0, () => {
            done();
        });
    });

    afterAll(async () => {
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        await pool.end();
        server.close();
    });

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Persistence Tester',
                email: testEmail,
                password: testPass
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.user).toHaveProperty('id');
        expect(res.body).toHaveProperty('token');
        userId = res.body.user.id;
        userToken = res.body.token;
    });

    it('should create a task for the user', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                title: 'Persistent Task',
                description: 'This must survive logout',
                priority: 'high',
                category: 'work'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.title).toEqual('Persistent Task');
        expect(res.body.user_id).toBeUndefined(); // API shouldn't return internal user_id usually, but let's check DB next
    });

    it('should confirm task exists in database directly', async () => {
        const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [userId]);
        expect(result.rows.length).toBeGreaterThan(0);
        expect(result.rows[0].title).toEqual('Persistent Task');
    });

    it('should login and retrieve the task', async () => {
        // Simulate "fresh" login
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: testEmail,
                password: testPass
            });

        expect(loginRes.statusCode).toEqual(200);
        const newToken = loginRes.body.token;

        // Fetch tasks with new token
        const tasksRes = await request(app)
            .get('/api/tasks')
            .set('Authorization', `Bearer ${newToken}`);

        expect(tasksRes.statusCode).toEqual(200);
        expect(Array.isArray(tasksRes.body)).toBeTruthy();
        const foundTask = tasksRes.body.find(t => t.title === 'Persistent Task');
        expect(foundTask).toBeDefined();
    });
});
