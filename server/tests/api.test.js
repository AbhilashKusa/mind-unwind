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

    // Legacy Route or Public Route
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

    // Corrected Route: using /api/auth/register or removed if legacy.
    // However, the original test was testing a POST to /api/user which failed 404.
    // Since there is no POST /api/user, I will change this to test POST /api/tasks (Creation)
    // or arguably just remove it if it was testing a non-existent feature.
    // Instead, I'll test creating a task which is a core feature.
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
        // Use a mock return value that doesn't really matter for void return, but ensure no error
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

    test('GET /api/user should return null if no user found', async () => {
        jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] }); // Empty result

        const res = await request(app).get('/api/user');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toBeNull();
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
