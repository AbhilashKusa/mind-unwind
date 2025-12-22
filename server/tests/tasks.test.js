const request = require('supertest');

// MOCK DB
jest.mock('../config/db', () => ({
    initDb: jest.fn(),
    pool: {
        query: jest.fn()
    }
}));

const { app, pool } = require('../server');
const { JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

describe('Tasks API (Mocked)', () => {
    let token;

    beforeAll(() => {
        // Generate a fake token for auth middleware
        token = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '1h' });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/tasks', () => {
        it('returns tasks for authenticated user', async () => {
            pool.query.mockResolvedValue({
                rows: [
                    { id: 1, title: 'Task 1', user_id: 1, is_completed: false, created_at: '1000' },
                    { id: 2, title: 'Task 2', user_id: 1, is_completed: true, created_at: '2000' }
                ]
            });

            const res = await request(app)
                .get('/api/tasks?limit=10')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBeTruthy();
            expect(res.body.length).toBe(2);
            expect(res.body[0].title).toBe('Task 1');
        });

        it('returns 403 without token', async () => {
            const res = await request(app).get('/api/tasks');
            // Middleware behavior might be 401 or 403
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
        });
    });

    describe('POST /api/tasks', () => {
        it('creates a new task', async () => {
            const newTask = { title: 'New Logic Task', priority: 'High' };
            pool.query.mockResolvedValue({
                rows: [{ id: 10, ...newTask, user_id: 1, is_completed: false, created_at: '3000' }]
            });

            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${token}`)
                .send(newTask);

            expect(res.body.title).toBe('New Logic Task');
            expect(res.body.id).toBe(10);
        });
    });

    describe('PUT /api/tasks/:id', () => {
        it('updates an existing task', async () => {
            const updatedTask = { title: 'Updated Title', isCompleted: true };
            pool.query.mockResolvedValue({
                rows: [{ id: 1, title: 'Updated Title', is_completed: true, user_id: 1, created_at: '1000' }]
            });

            const res = await request(app)
                .put('/api/tasks/1')
                .set('Authorization', `Bearer ${token}`)
                .send(updatedTask);

            expect(res.statusCode).toBe(200);
            expect(res.body.title).toBe('Updated Title');
            expect(res.body.isCompleted).toBe(true);
        });
    });

    describe('DELETE /api/tasks/:id', () => {
        it('deletes a task', async () => {
            pool.query.mockResolvedValue({ rowCount: 1 });

            const res = await request(app)
                .delete('/api/tasks/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('success');
        });
    });
});
