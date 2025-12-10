const request = require('supertest');
const { app, pool } = require('../server');

// Mock the auth middleware
jest.mock('../middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    },
    JWT_SECRET: 'test_secret'
}));

describe('API Endpoints', () => {

    afterAll(async () => {
        await pool.end();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // --- HAPPY PATHS ---

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

    test('POST /api/tasks should create task success', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({});

        const res = await request(app).post('/api/tasks').send({
            id: '124',
            title: 'New Task',
            description: 'New Desc',
            isCompleted: false,
            createdAt: 12345
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
    });

    test('POST /api/tasks should update existing task (Upsert)', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({});

        const res = await request(app).post('/api/tasks').send({
            id: '1', // Existing ID
            title: 'Updated Task',
            subtasks: [{ title: 'Sub 1', completed: true }]
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
    });

    // --- EDGE CASES & ERRORS ---

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
