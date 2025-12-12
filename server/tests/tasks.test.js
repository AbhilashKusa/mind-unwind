const request = require('supertest');
const { app, pool } = require('../server');

// Mock the auth middleware to allow authenticated requests
jest.mock('../middleware/auth', () => ({
    ...jest.requireActual('../middleware/auth'),
    authenticateToken: (req, res, next) => {
        if (req.headers['authorization']) {
            req.user = { id: 999, email: 'tasktest@example.com' };
            next();
        } else {
            res.sendStatus(401);
        }
    }
}));

describe('Tasks API', () => {
    const testTaskId = 'test-task-123';

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await pool.end();
    });

    // ===================== GET /api/tasks =====================
    describe('GET /api/tasks', () => {
        test('should return 401 without authorization', async () => {
            const res = await request(app).get('/api/tasks');
            expect(res.statusCode).toEqual(401);
        });

        test('should return empty array when no tasks', async () => {
            jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/tasks')
                .set('Authorization', 'Bearer fake_token');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual([]);
        });

        test('should return tasks with correct structure', async () => {
            jest.spyOn(pool, 'query').mockResolvedValueOnce({
                rows: [{
                    id: 'abc123',
                    title: 'Test Task',
                    description: 'A description',
                    priority: 'High',
                    category: 'Work',
                    is_completed: false,
                    due_date: '2024-12-31',
                    subtasks: [{ id: '1', title: 'Sub 1', isCompleted: false }],
                    comments: [],
                    created_at: '1704067200000'
                }]
            });

            const res = await request(app)
                .get('/api/tasks')
                .set('Authorization', 'Bearer fake_token');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0]).toMatchObject({
                id: 'abc123',
                title: 'Test Task',
                priority: 'High',
                isCompleted: false,
                dueDate: '2024-12-31'
            });
            expect(res.body[0].subtasks).toHaveLength(1);
        });

        test('should handle null subtasks gracefully', async () => {
            jest.spyOn(pool, 'query').mockResolvedValueOnce({
                rows: [{
                    id: 'abc123',
                    title: 'Task with null subtasks',
                    subtasks: null,
                    comments: null,
                    created_at: '1704067200000'
                }]
            });

            const res = await request(app)
                .get('/api/tasks')
                .set('Authorization', 'Bearer fake_token');

            expect(res.statusCode).toEqual(200);
            expect(res.body[0].subtasks).toEqual([]);
            expect(res.body[0].comments).toEqual([]);
        });

        test('should handle database errors', async () => {
            jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('DB connection failed'));

            const res = await request(app)
                .get('/api/tasks')
                .set('Authorization', 'Bearer fake_token');

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty('error');
        });
    });

    // ===================== POST /api/tasks =====================
    describe('POST /api/tasks', () => {
        test('should create a new task', async () => {
            jest.spyOn(pool, 'query').mockResolvedValueOnce({
                rows: [{
                    id: 'new-task-id',
                    title: 'New Task',
                    priority: 'Medium',
                    is_completed: false,
                    subtasks: [],
                    comments: [],
                    created_at: '1704067200000'
                }]
            });

            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', 'Bearer fake_token')
                .send({
                    title: 'New Task',
                    priority: 'Medium'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.title).toBe('New Task');
        });

        test('should create task with provided ID', async () => {
            jest.spyOn(pool, 'query').mockResolvedValueOnce({
                rows: [{
                    id: 'custom-id-123',
                    title: 'Task with ID',
                    is_completed: false,
                    subtasks: [],
                    comments: [],
                    created_at: '1704067200000'
                }]
            });

            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', 'Bearer fake_token')
                .send({
                    id: 'custom-id-123',
                    title: 'Task with ID'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.id).toBe('custom-id-123');
        });

        test('should create task with subtasks', async () => {
            const subtasks = [
                { id: '1', title: 'Step 1', isCompleted: false },
                { id: '2', title: 'Step 2', isCompleted: false }
            ];

            jest.spyOn(pool, 'query').mockResolvedValueOnce({
                rows: [{
                    id: 'task-with-subtasks',
                    title: 'Complex Task',
                    subtasks: subtasks,
                    comments: [],
                    is_completed: false,
                    created_at: '1704067200000'
                }]
            });

            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', 'Bearer fake_token')
                .send({
                    title: 'Complex Task',
                    subtasks: subtasks
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.subtasks).toHaveLength(2);
        });

        test('should handle database errors on create', async () => {
            jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Insert failed'));

            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', 'Bearer fake_token')
                .send({ title: 'Task' });

            expect(res.statusCode).toEqual(500);
        });

        test('should return 401 without authorization', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .send({ title: 'Task' });

            expect(res.statusCode).toEqual(401);
        });
    });

    // ===================== PUT /api/tasks/:id =====================
    describe('PUT /api/tasks/:id', () => {
        test('should update an existing task', async () => {
            jest.spyOn(pool, 'query').mockResolvedValueOnce({
                rows: [{
                    id: testTaskId,
                    title: 'Updated Title',
                    priority: 'High',
                    is_completed: true,
                    subtasks: [],
                    comments: [],
                    created_at: '1704067200000'
                }]
            });

            const res = await request(app)
                .put(`/api/tasks/${testTaskId}`)
                .set('Authorization', 'Bearer fake_token')
                .send({
                    title: 'Updated Title',
                    isCompleted: true
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.title).toBe('Updated Title');
            expect(res.body.isCompleted).toBe(true);
        });

        test('should update task with subtasks', async () => {
            const newSubtasks = [
                { id: '1', title: 'New Step', isCompleted: true }
            ];

            jest.spyOn(pool, 'query').mockResolvedValueOnce({
                rows: [{
                    id: testTaskId,
                    title: 'Task',
                    subtasks: newSubtasks,
                    comments: [],
                    is_completed: false,
                    created_at: '1704067200000'
                }]
            });

            const res = await request(app)
                .put(`/api/tasks/${testTaskId}`)
                .set('Authorization', 'Bearer fake_token')
                .send({ subtasks: newSubtasks });

            expect(res.statusCode).toEqual(200);
            expect(res.body.subtasks).toEqual(newSubtasks);
        });

        test('should return 404 for non-existent task', async () => {
            jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .put('/api/tasks/non-existent-id')
                .set('Authorization', 'Bearer fake_token')
                .send({ title: 'Updated' });

            expect(res.statusCode).toEqual(404);
            expect(res.body.error).toBe('Task not found');
        });

        test('should handle database errors on update', async () => {
            jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Update failed'));

            const res = await request(app)
                .put(`/api/tasks/${testTaskId}`)
                .set('Authorization', 'Bearer fake_token')
                .send({ title: 'Updated' });

            expect(res.statusCode).toEqual(500);
        });

        test('should return 401 without authorization', async () => {
            const res = await request(app)
                .put(`/api/tasks/${testTaskId}`)
                .send({ title: 'Updated' });

            expect(res.statusCode).toEqual(401);
        });
    });

    // ===================== DELETE /api/tasks/:id =====================
    describe('DELETE /api/tasks/:id', () => {
        test('should delete a task', async () => {
            jest.spyOn(pool, 'query').mockResolvedValueOnce({ rowCount: 1 });

            const res = await request(app)
                .delete(`/api/tasks/${testTaskId}`)
                .set('Authorization', 'Bearer fake_token');

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
        });

        test('should handle delete of non-existent task gracefully', async () => {
            jest.spyOn(pool, 'query').mockResolvedValueOnce({ rowCount: 0 });

            const res = await request(app)
                .delete('/api/tasks/non-existent')
                .set('Authorization', 'Bearer fake_token');

            // Current implementation returns success even if no rows deleted
            expect(res.statusCode).toEqual(200);
        });

        test('should handle database errors on delete', async () => {
            jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Delete failed'));

            const res = await request(app)
                .delete(`/api/tasks/${testTaskId}`)
                .set('Authorization', 'Bearer fake_token');

            expect(res.statusCode).toEqual(500);
        });

        test('should return 401 without authorization', async () => {
            const res = await request(app)
                .delete(`/api/tasks/${testTaskId}`);

            expect(res.statusCode).toEqual(401);
        });
    });

    // ===================== Edge Cases =====================
    describe('Edge Cases', () => {
        test('should handle task with all optional fields null', async () => {
            jest.spyOn(pool, 'query').mockResolvedValueOnce({
                rows: [{
                    id: 'minimal-task',
                    title: 'Minimal',
                    description: null,
                    priority: null,
                    category: null,
                    due_date: null,
                    is_completed: false,
                    subtasks: null,
                    comments: null,
                    created_at: '1704067200000'
                }]
            });

            const res = await request(app)
                .get('/api/tasks')
                .set('Authorization', 'Bearer fake_token');

            expect(res.statusCode).toEqual(200);
            expect(res.body[0].subtasks).toEqual([]);
            expect(res.body[0].comments).toEqual([]);
        });

        test('should handle very long task titles', async () => {
            const longTitle = 'A'.repeat(255);

            jest.spyOn(pool, 'query').mockResolvedValueOnce({
                rows: [{
                    id: 'long-title-task',
                    title: longTitle,
                    is_completed: false,
                    subtasks: [],
                    comments: [],
                    created_at: '1704067200000'
                }]
            });

            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', 'Bearer fake_token')
                .send({ title: longTitle });

            expect(res.statusCode).toEqual(201);
            expect(res.body.title.length).toBe(255);
        });

        test('should handle special characters in task title', async () => {
            const specialTitle = "Task with 'quotes' and \"double\" <tags>";

            jest.spyOn(pool, 'query').mockResolvedValueOnce({
                rows: [{
                    id: 'special-task',
                    title: specialTitle,
                    is_completed: false,
                    subtasks: [],
                    comments: [],
                    created_at: '1704067200000'
                }]
            });

            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', 'Bearer fake_token')
                .send({ title: specialTitle });

            expect(res.statusCode).toEqual(201);
            expect(res.body.title).toBe(specialTitle);
        });
    });
});
