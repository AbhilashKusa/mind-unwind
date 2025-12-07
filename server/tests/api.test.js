const request = require('supertest');
const { app, pool } = require('../server');

describe('API Endpoints', () => {

    afterAll(async () => {
        await pool.end();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // --- HAPPY PATHS ---

    test('GET /api/user should return status 200 and data', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [{ name: 'Test User', avatar: 'test.jpg' }] });

        const res = await request(app).get('/api/user');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('name', 'Test User');
    });

    test('GET /api/tasks should return a list of tasks', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({
            rows: [{
                id: '1', title: 'Task 1', description: 'Desc', priority: 'High',
                category: 'Work', is_completed: false, due_date: '2023-01-01',
                subtasks: [], comments: [], created_at: '12345'
            }]
        });

        const res = await request(app).get('/api/tasks');
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].title).toBe('Task 1');
    });

    test('POST /api/user should create/update user success', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({});

        const res = await request(app).post('/api/user').send({
            name: 'New User',
            avatar: 'new.jpg'
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
    });

    // --- EDGE CASES & ERRORS ---

    test('GET /api/user should return null if no user found', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] }); // Empty result

        const res = await request(app).get('/api/user');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toBeNull(); // Client expects null if no user
    });

    test('POST /api/tasks should handle database error gracefully', async () => {
        // Simulate DB Error
        jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('DB Connection Failed'));

        const res = await request(app).post('/api/tasks').send({
            id: '123',
            title: 'Fail Task'
        });

        expect(res.statusCode).toEqual(500);
        expect(res.body).toHaveProperty('error');
    });

    test('DELETE /api/tasks/:id should return 200 even if ID does not exist', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({ rowCount: 0 });

        const res = await request(app).delete('/api/tasks/non-existent-id');
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
    });
});
